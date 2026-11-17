import { archiveFiles } from "./dossier";
import { createDocuments } from "./documents";
import { zipBytes } from "./exports";
import type { Scenario } from "./model";
import { generateScenario } from "./scenario";

export type ArchiveRequest = Pick<Scenario, "options" | "opening">;
export type ArchiveResponse = { archive: Blob } | { error: string };

self.onmessage = ({ data }: MessageEvent<ArchiveRequest>) => {
  try {
    // Replay the validated inputs to avoid cloning the large journal and its PDF models.
    const scenario = generateScenario(data.options, data.opening ?? undefined);
    const bytes = zipBytes(archiveFiles(scenario, createDocuments(scenario)));
    const archive = new Blob([bytes], { type: "application/zip" });
    self.postMessage({ archive } satisfies ArchiveResponse);
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "L’archive n’a pas pu être créée.";
    self.postMessage({ error } satisfies ArchiveResponse);
  }
};
