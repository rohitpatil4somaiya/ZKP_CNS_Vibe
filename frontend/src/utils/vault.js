// utils/vault.js
export async function deriveVaultKey(rootKey, username) {
  const enc = new TextEncoder();
  

  // HKDF-like derivation
  // importKey for HMAC requires an algorithm object with hash
  const key = await crypto.subtle.importKey('raw', rootKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'HMAC' }, key, enc.encode('vault-key|' + username));
  return new Uint8Array(signature.slice(0, 32));
}

export async function encryptVault(data, vaultKey, username) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const aesKey = await crypto.subtle.importKey('raw', vaultKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const aad = enc.encode(username + '|v1.0');
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, additionalData: aad },
    aesKey,
    enc.encode(JSON.stringify(data))
  );
  
  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);
  
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
    tag: btoa(String.fromCharCode(...tag)),
    version: '1.0'
  };
}

export async function decryptVault(vaultBlob, vaultKey, username) {
  const enc = new TextEncoder();
  
  const iv = Uint8Array.from(atob(vaultBlob.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(vaultBlob.ciphertext), c => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(vaultBlob.tag), c => c.charCodeAt(0));
  
  const encrypted = new Uint8Array(ciphertext.length + tag.length);
  encrypted.set(ciphertext);
  encrypted.set(tag, ciphertext.length);
  
  const aesKey = await crypto.subtle.importKey('raw', vaultKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const aad = enc.encode(username + '|v1.0');
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv, additionalData: aad },
    aesKey,
    encrypted
  );
  
  return JSON.parse(new TextDecoder().decode(decrypted));
}