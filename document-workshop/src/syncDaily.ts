import { env } from "node:process";
import { readDailySyncConfig, syncDaily } from "./dailySync";

try {
  const config = readDailySyncConfig(env);
  const { imported, replayed } = await syncDaily(config);
  console.info(`Atelier Kookia · ${imported} journée(s) importée(s), ${replayed} déjà reçue(s).`);
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : "La transmission à Kookia a échoué.");
  process.exitCode = 1;
}
