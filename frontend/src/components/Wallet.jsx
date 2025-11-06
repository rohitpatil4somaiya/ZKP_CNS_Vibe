import * as React from 'react'
import { deriveAesKeyFromPassword, encryptData, decryptData } from '@/lib/aes'
import { Button } from '@/components/ui/button'

export default function Wallet() {
  const [status, setStatus] = React.useState('')
  const [encryptedPriv, setEncryptedPriv] = React.useState(() => localStorage.getItem('wallet_priv_enc'))
  const [pubJwk, setPubJwk] = React.useState(() => localStorage.getItem('wallet_pub_jwk'))

  async function createWallet(password) {
    if (!password) return setStatus('Provide a password')
    setStatus('Generating keypair...')
    try {
      const kp = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      )
      const pubJwkObj = await crypto.subtle.exportKey('jwk', kp.publicKey)
      const privPkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
      const aes = await deriveAesKeyFromPassword(password, 'wallet-salt')
      const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privPkcs8)))
      const enc = await encryptData(aes, privBase64)
      localStorage.setItem('wallet_priv_enc', JSON.stringify(enc))
      localStorage.setItem('wallet_pub_jwk', JSON.stringify(pubJwkObj))
      setEncryptedPriv(JSON.stringify(enc))
      setPubJwk(JSON.stringify(pubJwkObj))
      setStatus('Wallet created and encrypted locally.')
    } catch  {
      setStatus('Failed to create wallet')
    }
  }

  async function unlockWallet(password) {
    if (!password) return setStatus('Provide a password')
    const encRaw = localStorage.getItem('wallet_priv_enc')
    if (!encRaw) return setStatus('No encrypted wallet found.')
    const enc = JSON.parse(encRaw)
    try {
      const aes = await deriveAesKeyFromPassword(password, 'wallet-salt')
      const dec = await decryptData(aes, enc.data, enc.iv)
      const bytes = Uint8Array.from(atob(dec), c => c.charCodeAt(0))
      await crypto.subtle.importKey(
        'pkcs8',
        bytes.buffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
      )
      setStatus('Wallet unlocked (private key imported into session).')
    } catch {
      setStatus('Failed to decrypt wallet: wrong password?')
    }
  }

  return (
    <div className="p-4 border rounded-md w-full max-w-xl">
      <h3 className="text-lg font-semibold mb-2">Wallet (local, encrypted)</h3>
      <div className="flex gap-2 items-center">
        <input id="wallet-pw" placeholder="wallet password" type="password" className="border p-2 rounded" />
        <Button onClick={() => createWallet(document.getElementById('wallet-pw').value)}>Create & Encrypt</Button>
        <Button onClick={() => unlockWallet(document.getElementById('wallet-pw').value)}>Unlock</Button>
      </div>
      <div className="mt-3">
        <div className="text-sm">Status: {status}</div>
        <div className="text-xs mt-2">Public (JWK): <pre className="break-words">{pubJwk}</pre></div>
      </div>
    </div>
  )
}
