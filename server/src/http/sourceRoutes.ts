import { Router } from "express";

export const sourceRoutes = Router();

const sources = [
  { kind: "pos", state: "not_connected", lastSuccessAt: null },
  { kind: "ticket_ocr", state: "not_connected", lastSuccessAt: null },
  { kind: "geocoding", state: "not_connected", lastSuccessAt: null },
  { kind: "weather", state: "not_connected", lastSuccessAt: null },
  { kind: "events", state: "not_connected", lastSuccessAt: null },
] as const;

sourceRoutes.get("/sources", (_req, res) => {
  res.json({ sources });
});
