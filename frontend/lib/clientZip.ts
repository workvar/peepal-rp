// Minimal, dependency-free ZIP writer (STORE method, no compression). Produces
// a valid .zip Blob in the browser. Enough for bundling a couple of small text
// files (the bulk-upload starter kit) without pulling in JSZip.

let crcTable: number[] | null = null;

function makeCrcTable(): number[] {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}

function crc32(bytes: Uint8Array): number {
  const t = (crcTable ??= makeCrcTable());
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u16 = (a: number[], v: number) => a.push(v & 0xff, (v >>> 8) & 0xff);
const u32 = (a: number[], v: number) =>
  a.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const pushAll = (a: number[], b: Uint8Array) => {
  for (let i = 0; i < b.length; i++) a.push(b[i]);
};

// Fixed DOS timestamp (2026-01-01 00:00) so archives are deterministic.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export function buildZip(files: { name: string; data: string }[]): Blob {
  const enc = new TextEncoder();
  const local: number[] = [];
  const central: number[] = [];

  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const offset = local.length;

    // Local file header.
    u32(local, 0x04034b50);
    u16(local, 20); // version needed
    u16(local, 0); // flags
    u16(local, 0); // method: stored
    u16(local, DOS_TIME);
    u16(local, DOS_DATE);
    u32(local, crc);
    u32(local, data.length); // compressed size
    u32(local, data.length); // uncompressed size
    u16(local, name.length);
    u16(local, 0); // extra length
    pushAll(local, name);
    pushAll(local, data);

    // Central directory header.
    u32(central, 0x02014b50);
    u16(central, 20); // version made by
    u16(central, 20); // version needed
    u16(central, 0); // flags
    u16(central, 0); // method
    u16(central, DOS_TIME);
    u16(central, DOS_DATE);
    u32(central, crc);
    u32(central, data.length);
    u32(central, data.length);
    u16(central, name.length);
    u16(central, 0); // extra
    u16(central, 0); // comment
    u16(central, 0); // disk number start
    u16(central, 0); // internal attrs
    u32(central, 0); // external attrs
    u32(central, offset); // local header offset
    pushAll(central, name);
  }

  const centralOffset = local.length;
  const out = local.concat(central);

  // End of central directory record.
  u32(out, 0x06054b50);
  u16(out, 0); // disk number
  u16(out, 0); // disk with central dir
  u16(out, files.length); // entries on this disk
  u16(out, files.length); // total entries
  u32(out, central.length);
  u32(out, centralOffset);
  u16(out, 0); // comment length

  return new Blob([new Uint8Array(out)], { type: "application/zip" });
}
