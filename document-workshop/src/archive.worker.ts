import { archiveFiles } from "./dossier";
import type { Scenario } from "./model";
import { generateScenario } from "./scenario";
import { zipArchive } from "./zip";

export type ArchiveRequest = Pick<Scenario, "options" | "opening">;
export type ArchiveResponse = { archive: Blob } | { error: string };

self.onmessage = ({ data }: MessageEvent<ArchiveRequest>) => {
  try {
    // Replay the validated inputs to avoid cloning the large journal and its PDF models.
    const scenario = generateScenario(data.options, data.opening ?? undefined);
    const archive = zipArchive(archiveFiles(scenario));
    self.postMessage({ archive } satisfies ArchiveResponse);
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "L’archive n’a pas pu être créée.";
    self.postMessage({ error } satisfies ArchiveResponse);
  }
};
