// lib/aes.js

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// --- Utilities ---
function ensureUint8Array(input) {
  if (typeof input === 'string') return encoder.encode(input)
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (input instanceof Uint8Array) return input
  throw new TypeError('Expected string | ArrayBuffer | Uint8Array')
}

// Safe base64 conversion for arbitrary length arrays (chunked to avoid stack issues)
function bytesToBase64(bytesLike) {
  const bytes = bytesLike instanceof ArrayBuffer ? new Uint8Array(bytesLike) : bytesLike
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

function base64ToUint8Array(b64) {
  const binary = atob(b64)
  const len = binary.length
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i)
  return out
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a password using PBKDF2(SHA-256).
 * - password: string
 * - salt: string | ArrayBuffer | Uint8Array
 * - iterations: number (default kept at 150_000 to remain compatible)
 * Returns a CryptoKey usable for AES-GCM encrypt/decrypt.
 */
export async function deriveAesKeyFromPassword(password, salt, iterations = 150_000) {
  if (typeof password !== 'string') throw new TypeError('password must be a string')
  if (!salt) throw new TypeError('salt is required')

  const saltBytes = ensureUint8Array(salt)
  const pwKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable (keeps compatibility with existing code that may export raw key)
    ['encrypt', 'decrypt']
  )

  return aesKey
}

/**
 * Encrypt a UTF-8 string using AES-GCM.
 * - key: CryptoKey
 * - plaintext: string
 * Returns: { iv: base64, data: base64 }
 * (data contains ciphertext || tag as produced by Web Crypto API)
 */
export async function encryptData(key, plaintext) {
  if (!key || !plaintext) throw new TypeError('encryptData requires (key, plaintext)')
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV per NIST recommendation
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
  return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(ct)) }
}

/**
 * Decrypt a base64 ciphertext produced by encryptData.
 * - key: CryptoKey
 * - dataBase64: base64 string (ciphertext+tag)
 * - ivBase64: base64 string
 * Returns: plaintext string
 */
export async function decryptData(key, dataBase64, ivBase64) {
  if (!key || !dataBase64 || !ivBase64) throw new TypeError('decryptData requires (key, dataBase64, ivBase64)')
  const iv = base64ToUint8Array(ivBase64)
  const ct = base64ToUint8Array(dataBase64).buffer
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return decoder.decode(pt)
}
