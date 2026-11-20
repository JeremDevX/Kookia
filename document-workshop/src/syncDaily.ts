import { argv, env } from "node:process";
import { syncDaily } from "./dailySync";
import { readDailySyncConfig } from "./dailySyncConfig";

try {
  const flags = argv.slice(2);
  if (flags.length > 1 || (flags.length === 1 && flags[0] !== "--retry-requested")) {
    throw new Error("Usage : documents:sync [--retry-requested]");
  }
  const config = readDailySyncConfig(env);
  const result = await syncDaily(config, undefined, flags[0] === "--retry-requested");
  if (result) {
    const { imported, replayed } = result;
    console.info(`Atelier Kookia · ${imported} journée(s) importée(s), ${replayed} déjà reçue(s).`);
    if (config.includeStock) console.info(`Stocks · ${imported + replayed} clôture(s) confirmée(s).`);
    if (config.includeOperations) console.info(`Opérations · ${imported + replayed} journée(s) confirmée(s).`);
  }
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : "La transmission à Kookia a échoué.");
  process.exitCode = 1;
}
