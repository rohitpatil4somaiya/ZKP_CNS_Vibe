import { scrypt } from 'scrypt-js';

export async function deriveRootKey(password, saltBytes, kdf_params) {
  const enc = new TextEncoder();

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function toUint8ArraySalt(salt) {
    if (!salt) return null;
    if (salt instanceof Uint8Array) return salt;
    if (salt instanceof ArrayBuffer) return new Uint8Array(salt);
    if (Array.isArray(salt)) return new Uint8Array(salt);
    if (typeof salt === 'string') {
      try {
        return base64ToBytes(salt);
      } catch {
        return enc.encode(salt);
      }
    }
    return null;
  }

  const saltUA = toUint8ArraySalt(saltBytes);

  if (!saltUA || !saltUA.length) {
    throw new Error('Salt is empty or invalid');
  }

  // Extract or default scrypt parameters
  const {
    N = 16384, // CPU/memory cost (must be power of 2)
    r = 8,     // block size
    p = 1,     // parallelization
    dkLen = 32 // derived key length (32 bytes)
  } = kdf_params || {};

  // Convert password to Uint8Array
  const passwordBytes = enc.encode(password);

  // Perform scrypt key derivation
  const derivedKey = await scrypt(passwordBytes, saltUA, N, r, p, dkLen);


  return new Uint8Array(derivedKey);
}
