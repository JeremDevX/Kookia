import { createHash } from "node:crypto";

export const MAX_TICKET_FILE_BYTES = 4 * 1024 * 1024;
const maxImageSide = 10_000;
const maxImagePixels = 25_000_000;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegStartOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export type TicketFileMetadata = { contentHash: string; mimeType: "application/pdf" | "image/jpeg" | "image/png"; byteSize: number };
export type TicketFileInspection =
  | { valid: true; metadata: TicketFileMetadata }
  | { valid: false; status: 400 | 413 | 415; code: string; message: string };

function dimensionsValid(width: number, height: number) {
  return width > 0 && height > 0 && width <= maxImageSide && height <= maxImageSide && width * height <= maxImagePixels;
}

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd8) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (jpegStartOfFrame.has(marker)) {
      if (segmentLength < 8 || offset + 7 > bytes.length) return null;
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  return null;
}

function inspectMime(bytes: Buffer, mimeType: string): TicketFileInspection | null {
  if (mimeType === "application/pdf") {
    const headerOk = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    const tail = bytes.subarray(Math.max(0, bytes.length - 1024)).toString("latin1");
    return headerOk && tail.includes("%%EOF") ? null : {
      valid: false, status: 400, code: "INVALID_TICKET_FILE", message: "Le fichier PDF est illisible ou incomplet.",
    };
  }
  if (mimeType === "image/png") {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature) || bytes.toString("ascii", 12, 16) !== "IHDR")
      return { valid: false, status: 400, code: "INVALID_TICKET_FILE", message: "L’image PNG est illisible ou incomplète." };
    if (!dimensionsValid(bytes.readUInt32BE(16), bytes.readUInt32BE(20)))
      return { valid: false, status: 400, code: "TICKET_IMAGE_TOO_LARGE", message: "La résolution de l’image dépasse la limite autorisée." };
    let offset = 8;
    let sawHeader = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      if (length > bytes.length - offset - 12) break;
      const kind = bytes.toString("ascii", offset + 4, offset + 8);
      if (!sawHeader && (kind !== "IHDR" || length !== 13)) break;
      if (kind === "IHDR") {
        if (sawHeader) break;
        sawHeader = true;
      }
      offset += length + 12;
      if (kind === "IEND") {
        if (length === 0 && offset === bytes.length) return null;
        break;
      }
    }
    return { valid: false, status: 400, code: "INVALID_TICKET_FILE", message: "L’image PNG est illisible ou incomplète." };
  }
  if (mimeType === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
      return { valid: false, status: 400, code: "INVALID_TICKET_FILE", message: "L’image JPEG est illisible ou incomplète." };
    const dimensions = jpegDimensions(bytes);
    if (!dimensions) return { valid: false, status: 400, code: "INVALID_TICKET_FILE", message: "Les dimensions de l’image JPEG sont introuvables." };
    if (!dimensionsValid(dimensions.width, dimensions.height))
      return { valid: false, status: 400, code: "TICKET_IMAGE_TOO_LARGE", message: "La résolution de l’image dépasse la limite autorisée." };
    return null;
  }
  return { valid: false, status: 415, code: "UNSUPPORTED_TICKET_TYPE", message: "Choisissez un PDF, JPEG ou PNG." };
}

export function inspectTicketFile(contentType: string | undefined, input: unknown): TicketFileInspection {
  const mimeType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (!mimeType || !["application/pdf", "image/jpeg", "image/png"].includes(mimeType))
    return { valid: false, status: 415, code: "UNSUPPORTED_TICKET_TYPE", message: "Choisissez un PDF, JPEG ou PNG." };
  if (!Buffer.isBuffer(input) || input.length === 0)
    return { valid: false, status: 400, code: "INVALID_TICKET_FILE", message: "Le fichier Ticket Z est vide ou illisible." };
  if (input.length > MAX_TICKET_FILE_BYTES)
    return { valid: false, status: 413, code: "TICKET_FILE_TOO_LARGE", message: "Le fichier dépasse 4 Mio." };
  const error = inspectMime(input, mimeType);
  if (error) return error;
  return { valid: true, metadata: { contentHash: createHash("sha256").update(input).digest("hex"),
    mimeType: mimeType as TicketFileMetadata["mimeType"], byteSize: input.length } };
}
