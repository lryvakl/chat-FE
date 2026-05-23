import { getSodium } from './sodium';

export const toB64 = async (bytes: Uint8Array): Promise<string> => {
  const s = await getSodium();
  return s.to_base64(bytes, s.base64_variants.ORIGINAL);
};

export const fromB64 = async (b64: string): Promise<Uint8Array> => {
  const s = await getSodium();
  return s.from_base64(b64, s.base64_variants.ORIGINAL);
};

export const utf8 = (str: string): Uint8Array => new TextEncoder().encode(str);

export const fromUtf8 = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

export const concat = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};
