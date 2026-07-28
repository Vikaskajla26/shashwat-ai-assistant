import fs from 'fs';
import zlib from 'zlib';

function createPNGBuffer(width, height) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // Truecolor with alpha (RGBA)
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image pixels: 256x256 RGBA (Cyan sphere gradient)
  const rawLines = [];
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = 1 + x * 4;

      if (dist < 100) {
        line[idx] = 0; // R
        line[idx + 1] = Math.floor(200 + 55 * (1 - dist / 100)); // G (Cyan)
        line[idx + 2] = 255; // B
        line[idx + 3] = Math.floor(255 * (1 - dist / 100)); // A
      } else {
        line[idx] = 0;
        line[idx + 1] = 0;
        line[idx + 2] = 0;
        line[idx + 3] = 0;
      }
    }
    rawLines.push(line);
  }

  const rawData = Buffer.concat(rawLines);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);

  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Table-based CRC32 for PNG validation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const pngData = createPNGBuffer(256, 256);
fs.writeFileSync('assets/icon.png', pngData);
console.log('Successfully generated valid 256x256 PNG icon at assets/icon.png');
