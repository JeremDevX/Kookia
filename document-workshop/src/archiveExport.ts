import type { ArchiveRequest, ArchiveResponse } from "./archive.worker";

export async function createArchive(request: ArchiveRequest) {
  const worker = new Worker(new URL("./archive.worker.ts", import.meta.url), { type: "module" });
  try {
    return await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = ({ data }: MessageEvent<ArchiveResponse>) => {
        if ("error" in data) reject(new Error(data.error));
        else resolve(data.archive);
      };
      const failed = () => reject(new Error("L’archive n’a pas pu être créée. Réessayez."));
      worker.onerror = failed;
      worker.onmessageerror = failed;
      worker.postMessage(request);
    });
  } finally {
    worker.terminate();
  }
}
