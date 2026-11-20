#!/usr/bin/env bash
set -euo pipefail
umask 022
base=/srv/kookia-preview
current=$base/current
api=kookia-preview-api.service
sync=kookia-workshop-sync.service
scheduled=kookia-workshop-sync.timer
retry=kookia-workshop-retry.service
retry_timer=kookia-workshop-retry.timer
systemd=/etc/systemd/system
state_directory=/var/lib/kookia-workshop
lock=$state_directory/.transfer.lock
revision=$1
origin=$2
[[ "$revision" =~ ^[a-f0-9]{12}$ && "$origin" =~ ^https://[0-9.]+$ ]]
exec 9>"$base/.deploy.lock"
flock -n 9
[[ "$(basename "$(readlink -f "$current")")" == "$revision" ]]
systemctl is-active --quiet "$api"
systemctl is-active --quiet "$scheduled"
[[ "$(systemctl show "$sync" -p ActiveState --value)" == inactive ]]
[[ "$(systemctl show "$scheduled" -p TimersCalendar --value)" == *'03:00:00 Europe/Paris'* ]]
[[ -d "$state_directory" && ! -L "$state_directory" ]]
no_new_privileges=$(systemctl show "$sync" -p NoNewPrivileges --value)
[[ "$no_new_privileges" == yes || "$no_new_privileges" == no ]]
today=$(TZ=Europe/Paris date +%F)
yesterday=$(TZ=Europe/Paris date -d yesterday +%F)

settings=$(/opt/kookia-preview-node/bin/node - <<'NODE'
const { readFileSync } = require("node:fs");
const { parseEnv } = require("node:util");
const path = "/etc/kookia-preview/workshop.env";
const selected = /^WORKSHOP_(STATE_FILE|STOCK_STATE_FILE|OPERATIONS_STATE_FILE|LIVE_WEATHER_FROM|CONTROL_FROM)=/;
const env = parseEnv(readFileSync(path, "utf8").split("\n").filter(line => selected.test(line)).join("\n"));
if (env.WORKSHOP_CONTROL_FROM) throw new Error("Le suivi est déjà configuré.");
const current = env.WORKSHOP_OPERATIONS_STATE_FILE ?? env.WORKSHOP_STOCK_STATE_FILE ?? env.WORKSHOP_STATE_FILE;
const { asOf } = JSON.parse(readFileSync(current, "utf8"));
if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(asOf)) throw new Error("Clôture Atelier illisible.");
const weather = env.WORKSHOP_LIVE_WEATHER_FROM ?? "";
if (weather && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(weather)) throw new Error("Date météo illisible.");
process.stdout.write(asOf + (weather ? " " + weather : ""));
NODE
)
read -r checkpoint weather_from <<< "$settings"
if [[ -z "$weather_from" ]]; then
  weather_from=$(systemctl show "$sync" -p Environment --value |
    tr ' ' '\n' | sed -nE 's/^WORKSHOP_LIVE_WEATHER_FROM=([0-9]{4}-[0-9]{2}-[0-9]{2})$/\1/p')
fi
[[ "$checkpoint" < "$today" ]]
[[ -z "$weather_from" || "$weather_from" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]

api_drop="$systemd/$api.d/30-kookia-workshop-schedule.conf"
sync_drop="$systemd/$sync.d/30-kookia-workshop-control.conf"
retry_service="$systemd/$retry"
retry_schedule="$systemd/$retry_timer"
for file in "$api_drop" "$sync_drop" "$retry_service" "$retry_schedule"; do
  [[ ! -e "$file" && ! -L "$file" ]]
done
[[ ! -L "$lock" ]]
if [[ ! -e "$lock" ]]; then
  install -o kookia-preview -g kookia-preview -m 0600 /dev/null "$lock"
fi
[[ -f "$lock" ]]
mkdir -p "$(dirname "$api_drop")" "$(dirname "$sync_drop")"
stage=$(mktemp -d "$systemd/.kookia-workshop-control.XXXXXXXX")
installed=()
success=false
cleanup() {
  rm -rf -- "$stage"
  if ! $success && (( ${#installed[@]} > 0 )); then
    systemctl disable --now "$retry_timer" >/dev/null 2>&1 || true
    rm -- "${installed[@]}"
    systemctl daemon-reload
    systemctl restart "$api"
    echo "Réglages précédents de l’atelier rétablis." >&2
  fi
}
trap cleanup EXIT

cat >"$stage/api.conf" <<'UNIT'
[Service]
Environment="WORKSHOP_SCHEDULE_TIME=03:00"
UNIT

cat >"$stage/sync.conf" <<UNIT
[Service]
Environment="WORKSHOP_CONTROL_FROM=$today"
ExecStart=
ExecStart=/usr/bin/flock -w 120 $lock /opt/kookia-preview-node/bin/node --import tsx document-workshop/src/syncDaily.ts
UNIT

cat >"$stage/retry.service" <<UNIT
[Unit]
Description=Reprendre un transfert demandé dans l’atelier Kookia
After=$api

[Service]
Type=oneshot
User=kookia-preview
Group=kookia-preview
WorkingDirectory=$current
EnvironmentFile=/etc/kookia-preview/workshop.env
Environment="WORKSHOP_CONTROL_FROM=$today"
Environment="WORKSHOP_LIVE_WEATHER_FROM=$weather_from"
ExecStart=/usr/bin/flock -n -E 0 $lock /opt/kookia-preview-node/bin/node --import tsx document-workshop/src/syncDaily.ts --retry-requested
StateDirectory=kookia-workshop
StateDirectoryMode=0700
NoNewPrivileges=$no_new_privileges
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
TimeoutStartSec=15min
UNIT

cat >"$stage/retry.timer" <<UNIT
[Unit]
Description=Vérifier les demandes de reprise de l’atelier Kookia

[Timer]
OnActiveSec=15s
OnUnitInactiveSec=1min
AccuracySec=5s
Unit=$retry

[Install]
WantedBy=timers.target
UNIT

for mapping in "api.conf:$api_drop" "sync.conf:$sync_drop" "retry.service:$retry_service" "retry.timer:$retry_schedule"; do
  source=${mapping%%:*}
  destination=${mapping#*:}
  mv -T -- "$stage/$source" "$destination"
  installed+=("$destination")
done
systemctl daemon-reload
systemctl restart "$api"
for attempt in {1..20}; do
  if curl -fsS --max-time 2 "$origin/api/ready" >/dev/null 2>&1; then break; fi
  [[ "$attempt" -lt 20 ]]
  sleep 1
done
if [[ "$checkpoint" == "$yesterday" ]]; then
  systemctl start "$sync"
  [[ "$(systemctl show "$sync" -p Result --value)" == success ]]
fi
systemctl start "$retry"
systemctl enable --now "$retry_timer"
systemctl is-active --quiet "$retry_timer"
systemctl is-active --quiet "$scheduled"
success=true
printf 'Génération automatique reliée à Kookia depuis le %s.\n' "$today"
systemctl show "$scheduled" -p NextElapseUSecRealtime
systemctl show "$retry_timer" -p ActiveState -p UnitFileState
