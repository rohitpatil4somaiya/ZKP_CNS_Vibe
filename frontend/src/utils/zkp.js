
import * as secp from '@noble/secp256k1';

// curve order (used for modular arithmetic)
const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

// convert Uint8Array → BigInt
function bytesToBigInt(bytes) {
  let num = 0n;
  for (const b of bytes) num = (num << 8n) + BigInt(b);
  return num;
}

// hex ↔ bytes compatibility (for older versions of secp256k1)
function hexToBytes(hex) {
  if (typeof secp.utils?.hexToBytes === 'function') return secp.utils.hexToBytes(hex);
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

function bytesToHex(bytes) {
  if (typeof secp.utils?.bytesToHex === 'function') return secp.utils.bytesToHex(bytes);
  return Buffer.from(bytes).toString('hex');
}

// randomBytes fallback 
function randomBytes(length) {
  if (typeof secp.utils?.randomBytes === 'function') return secp.utils.randomBytes(length);
  const arr = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    // Node.js fallback
    const { randomFillSync } = require('crypto');
    randomFillSync(arr);
  }
  return arr;
}

//Convert rootKey → scalar x 
export function rootKeyToScalar(rootKey) {
  // map key bytes into a valid scalar in [1, n-1]
  const x = (bytesToBigInt(rootKey) % (n - 1n)) + 1n;
  return x;
}

// Compute public key Y = x * G 
export function computePublicY(rootKey) {
  const x = rootKeyToScalar(rootKey);
  const privHex = x.toString(16).padStart(64, '0');

  // Convert hex → Uint8Array before passing to getPublicKey
  const privBytes = hexToBytes(privHex);

  const pubBytes = secp.getPublicKey(privBytes, true); // compressed form
  const pubHex = bytesToHex(pubBytes);

  return { x, publicY: pubHex };
}

//  Generate Schnorr proof 
export async function generateProof(x, serverChallenge) {
  // random nonce k
  const kBytes = randomBytes(32);
  const k = (bytesToBigInt(kBytes) % (n - 1n)) + 1n;
  const kHex = k.toString(16).padStart(64, '0');

  // R = k * G
  const Rpoint = secp.getPublicKey(hexToBytes(kHex), true);
  const Rhex = bytesToHex(Rpoint);

  // Y = x * G
  const Ypoint = secp.getPublicKey(hexToBytes(x.toString(16).padStart(64, '0')), true);

  // Compute challenge c = H(serverChallenge || R || Y)
  const enc = new TextEncoder();
  const challengeBytes = enc.encode(serverChallenge);
  const data = new Uint8Array(
    challengeBytes.length + Rpoint.length + Ypoint.length
  );
  data.set(challengeBytes, 0);
  data.set(Rpoint, challengeBytes.length);
  data.set(Ypoint, challengeBytes.length + Rpoint.length);

  const digest = await crypto.subtle.digest('SHA-256', data);
  const digestBytes = new Uint8Array(digest);
  const c = bytesToBigInt(digestBytes) % n;

  // s = (k + c*x) mod n
  const s = (k + c * x) % n;

  return {
    R: Rhex,
    s: s.toString(16).padStart(64, '0'),
    c: c.toString(16),
  };
}
