import { optionsSchema } from "./model";

export const workshopOptions = optionsSchema.parse({ name: "Maison Sureau", address: "18, passage des Tilleuls", city: "44000 Nantes",
  email: "bonjour@maison-sureau.example", start: "2026-09-01", days: 30, covers: 40, seed: 1,
  incident: "normal", variationPercent: 20, lossPercent: 2, starterPercent: 65, dessertPercent: 60, incidentEvery: 1 });
