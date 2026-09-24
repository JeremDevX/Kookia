import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { MAX_TICKET_FILE_BYTES, inspectTicketFile } from "./ticketFile.js";

const png = (width: number, height: number) => {
  const chunk = (kind: string, data: Buffer) => {
    const header = Buffer.alloc(8); header.writeUInt32BE(data.length); header.write(kind, 4);
    return Buffer.concat([header, data, Buffer.alloc(4)]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", Buffer.alloc(0)), chunk("IEND", Buffer.alloc(0))]);
};
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x32, 0x00, 0x64, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9]);
const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Page >>\n%%EOF");

it("checks actual file signatures and bounded image dimensions before hashing", () => {
  const result = inspectTicketFile("application/pdf", pdf);
  expect(result).toMatchObject({ valid: true, metadata: { mimeType: "application/pdf", byteSize: pdf.length,
    contentHash: createHash("sha256").update(pdf).digest("hex") } });
  expect(inspectTicketFile("image/png", png(3200, 2400))).toMatchObject({ valid: true, metadata: { mimeType: "image/png" } });
  expect(inspectTicketFile("image/jpeg", jpeg)).toMatchObject({ valid: true, metadata: { mimeType: "image/jpeg" } });
  expect(inspectTicketFile("application/pdf", Buffer.from("not a pdf"))).toMatchObject({ valid: false, code: "INVALID_TICKET_FILE" });
  expect(inspectTicketFile("application/pdf", png(20, 20))).toMatchObject({ valid: false, code: "INVALID_TICKET_FILE" });
  expect(inspectTicketFile("image/png", png(20, 20).subarray(0, -12))).toMatchObject({ valid: false, code: "INVALID_TICKET_FILE" });
  expect(inspectTicketFile("image/jpeg", jpeg.subarray(0, -2))).toMatchObject({ valid: false, code: "INVALID_TICKET_FILE" });
  expect(inspectTicketFile("application/octet-stream", pdf)).toMatchObject({ valid: false, status: 415, code: "UNSUPPORTED_TICKET_TYPE" });
  expect(inspectTicketFile("image/png", png(10_000, 10_000))).toMatchObject({ valid: false, code: "TICKET_IMAGE_TOO_LARGE" });
});

it("rejects empty and oversized file bodies without returning any source bytes", () => {
  expect(inspectTicketFile("application/pdf", Buffer.alloc(0))).toMatchObject({ valid: false, code: "INVALID_TICKET_FILE" });
  expect(inspectTicketFile("application/pdf", Buffer.alloc(MAX_TICKET_FILE_BYTES + 1)))
    .toMatchObject({ valid: false, status: 413, code: "TICKET_FILE_TOO_LARGE" });
});
