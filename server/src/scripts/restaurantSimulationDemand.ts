import { createHash } from "node:crypto";

const RECENT_OPENING = "2026-08-26";
const hash32 = (value: string) => createHash("sha256").update(value).digest().readUInt32BE(0);
const dayOfWeek = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export const dateAt = (date: string, hour: number) => `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
export const dayOffset = (date: string, offset: number) => new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);

export function isOpen(date: string, openThroughDate: string) {
  if (date >= RECENT_OPENING && date <= openThroughDate) return true;
  const month = Number(date.slice(5, 7));
  const weekday = dayOfWeek(date);
  return month >= 6 && month <= 8 ? weekday !== 1 : weekday >= 3 || weekday === 0;
}

function serviceFactor(date: string) {
  const weekday = dayOfWeek(date);
  const month = Number(date.slice(5, 7));
  const weekend = weekday === 5 || weekday === 6 ? 1.28 : weekday === 0 ? 1.12 : 0.9;
  const season = month >= 5 && month <= 8 ? 1.14 : month <= 2 || month === 11 || month === 12 ? 0.82 : 1;
  const year = Number(date.slice(0, 4));
  const maturity = 0.86 + Math.min(3, year - 2023) * 0.045;
  return weekend * season * maturity;
}

export function soldPortions(recipeId: string, base: number, date: string) {
  const variance = 0.9 + (hash32(`${date}:${recipeId}`) % 21) / 100;
  return Math.max(1, Math.round(base * serviceFactor(date) * variance));
}

export function estimatedUnsoldPortions(recipeId: string, sold: number, date: string) {
  const expected = sold * 0.015;
  const whole = Math.floor(expected);
  const remainder = expected - whole;
  return whole + (hash32(`${date}:${recipeId}:waste`) / 0x1_0000_0000 < remainder ? 1 : 0);
}
