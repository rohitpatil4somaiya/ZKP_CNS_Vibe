// lib/sss.js

import sss from 'shamirs-secret-sharing'

// --- Helpers for Web Crypto <-> SSS Buffer conversion ---
function arrayBufferToBuffer(ab) {
  return Buffer.from(new Uint8Array(ab))
}

function bufferToArrayBuffer(buffer) {
  return new Uint8Array(buffer).buffer
}

/**
 * Splits a CryptoKey (Master Key) into shares using SSS.
 * @param {CryptoKey} masterKey - The AES key to be split.
 * @param {number} total - Total number of shares (N).
 * @param {number} threshold - Shares needed for recovery (T).
 * @returns {Promise<string[]>} - An array of shares (hex strings).
 */

export async function splitMasterKey(masterKey, total, threshold) {
  console.log('🔍 SSS Split: Starting with T=' + threshold + ', N=' + total)
  
  const keyBuffer = await crypto.subtle.exportKey('raw', masterKey)
  console.log('🔍 SSS Split: Exported raw key, length:', keyBuffer.byteLength, 'bytes')
  
  // Ensure key is exactly 32 bytes (256 bits) for SSS
  const keyBytes = new Uint8Array(keyBuffer)
  let key32;
  if (keyBytes.length === 32) {
    key32 = keyBytes;
  } else if (keyBytes.length < 32) {
    // Pad with zeros to 32 bytes
    key32 = new Uint8Array(32);
    key32.set(keyBytes);
    console.warn('⚠️ SSS Split: Key is shorter than 32 bytes, padded with zeros');
  } else {
    // Key is longer than 32 bytes, throw error
    throw new Error('Master key is longer than 32 bytes (256 bits); refusing to truncate. Please provide a 32-byte key.');
  }
  console.log('🔍 SSS Split: Using', key32.length, 'bytes for splitting')
  console.log('🔍 SSS Split: Key (hex):', Buffer.from(key32).toString('hex'))
  
  const keyBuf = Buffer.from(key32);

  // Use Buffer for the secret input
  const shares = sss.split(keyBuf, { shares: total, threshold: threshold })
  console.log('✅ SSS Split: Generated', shares.length, 'shares')
  console.log('Share buffer lengths:', shares.map(s => s.length))

  // Shares are Buffers, return them as hex strings
  const hexShares = shares.map(share => share.toString('hex'))
  console.log('✅ SSS Split: Converted to hex, lengths:', hexShares.map(s => s.length))
  
  return hexShares
}

/**
 * Reconstructs the Master Key from a set of hex-encoded shares.
 * @param {string[]} hexShares - An array of hex-encoded share strings.
 * @returns {Promise<CryptoKey>} - The reconstructed AES Master Key.
 */
export async function reconstructMasterKey(hexShares) {
  console.log('🔍 SSS: Starting reconstruction with', hexShares.length, 'shares')
  console.log('Share lengths:', hexShares.map(s => s.length))
  
  try {
    const shares = hexShares.map(hex => Buffer.from(hex, 'hex'))
    console.log('🔍 SSS: Converted to buffers, lengths:', shares.map(s => s.length))

    // The SSS library combines Buffers
    const recoveredKeyBuffer = sss.combine(shares)
    console.log('🔍 SSS: Combined key buffer length:', recoveredKeyBuffer.length)
    console.log('🔍 SSS: Recovered key (hex):', recoveredKeyBuffer.toString('hex'))

    // Import the recovered key back into the Web Crypto API as AES-GCM 256
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      bufferToArrayBuffer(recoveredKeyBuffer),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    console.log('✅ SSS: Successfully imported as CryptoKey')
    
    return cryptoKey
  } catch (error) {
    console.error('❌ SSS: Reconstruction failed:', error)
    throw new Error(`SSS reconstruction failed: ${error.message}`)
  }
}