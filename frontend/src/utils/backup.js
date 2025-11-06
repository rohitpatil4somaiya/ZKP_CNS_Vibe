// backup.js
// Client-side helpers to encrypt/decrypt the private key backup using AES-GCM
import { deriveRootKey } from './kdf';


export async function encryptBackup(rootKeyBytes, privateHex) {
  // rootKeyBytes: Uint8Array (32 bytes) derived from password
  // privateHex: hex string of private scalar bytes
  const key = await crypto.subtle.importKey('raw', rootKeyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = hexToBytes(privateHex);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

export async function decryptBackup(rootKeyBytes, encrypted) {
  const key = await crypto.subtle.importKey('raw', rootKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ct = base64ToArrayBuffer(encrypted.ciphertext);

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return bytesToHex(new Uint8Array(plain));
}

export async function deriveRootKeyFromPassword(password, salt_kdf, kdf_params) {
  return await deriveRootKey(password, salt_kdf, kdf_params);
}


// --- Conversion utilities ---

const hexToBytes = hex =>
  Uint8Array.from(hex.replace(/^0x/, '').match(/.{1,2}/g).map(b => parseInt(b, 16)));

const bytesToHex = bytes =>
  [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

const arrayBufferToBase64 = buffer =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const base64ToArrayBuffer = base64 =>
  Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
