const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[index]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ArchiveFile { name: string; bytes: Uint8Array<ArrayBuffer> }

// ZIP store mode keeps this local exporter dependency-free.
export function zipArchive(files: ArchiveFile[]): Blob {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [], directory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), checksum = crc32(file.bytes);
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
    view.setUint16(12, 33, true); view.setUint32(14, checksum, true); view.setUint32(18, file.bytes.length, true);
    view.setUint32(22, file.bytes.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
    parts.push(header, file.bytes);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true); cv.setUint32(16, checksum, true);
    cv.setUint32(20, file.bytes.length, true); cv.setUint32(24, file.bytes.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    directory.push(central); offset += header.length + file.bytes.length;
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: "application/zip" });
}
