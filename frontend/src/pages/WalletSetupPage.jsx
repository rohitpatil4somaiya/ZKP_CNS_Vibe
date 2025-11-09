import * as React from 'react'
import { useNavigate } from 'react-router-dom'
//import { createSocialWallet } from '../lib/wallet_recovery'
import { sendSharesEmail, saveVault } from '../utils/api'
import { deriveRootKey } from '../utils/kdf'
import { splitMasterKey } from '../lib/sss'

const Button = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-all ${className}`}
  >
    {children}
  </button>
)

export default function WalletSetupPage() {
  const navigate = useNavigate()
  const [status, setStatus] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [totalShares, setTotalShares] = React.useState(3)
  const [threshold, setThreshold] = React.useState(2)
  const [shareData, setShareData] = React.useState(null)
  const [senderEmail, setSenderEmail] = React.useState('')
  const [friendEmails, setFriendEmails] = React.useState(['', '', ''])

  const handleCreateWallet = async () => {
    if (!password) return setStatus('Provide a wallet password.')
    if (threshold < 2 || threshold > totalShares) {
      return setStatus('Error: Threshold (T) must be >= 2 and <= Total Shares (N).')
    }
    if (friendEmails.slice(0, totalShares).some(e => !e || !e.includes('@'))) {
      return setStatus('Please enter valid friend emails for all selected N.')
    }
    
    const username = localStorage.getItem('current_user') || ''
    if (!username) {
      return setStatus('Username not found. Please register first.')
    }

    setStatus('Deriving master key from your password...')
    try {
      // Get the stored KDF parameters from registration
      const salt_kdf = localStorage.getItem(`salt_kdf_${username}`)
      const kdf_params = JSON.parse(localStorage.getItem(`kdf_params_${username}`))
      
      if (!salt_kdf || !kdf_params) {
        return setStatus('Registration data not found. Please register again.')
      }

      // Derive the SAME root key used during registration
      const rootKey = await deriveRootKey(password, salt_kdf, kdf_params)
      console.log('🔍 Wallet Setup: Root key derived, length:', rootKey.length, 'bytes')
      
      // Convert root key to CryptoKey for SSS
      const masterKey = await crypto.subtle.importKey(
        'raw',
        rootKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )
      console.log('✅ Wallet Setup: Master key imported as CryptoKey')

      setStatus('Creating wallet keypair...')
      
      // 1. Generate ECDSA Keypair for wallet
      const walletKeypair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      )
      
      const pubJwk = await crypto.subtle.exportKey('jwk', walletKeypair.publicKey)
      const privPkcs8 = await crypto.subtle.exportKey('pkcs8', walletKeypair.privateKey)
      const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privPkcs8)))
     
      
      // 2. Encrypt the wallet private key with the master key
      setStatus('Encrypting wallet with master key...')
      const ivBytes = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivBytes },
        masterKey,
        new TextEncoder().encode(privBase64)
      )
    
      
      // Store encrypted wallet and public key
      const vault_blob = { data: Array.from(new Uint8Array(encrypted)), iv: Array.from(ivBytes) }
      localStorage.setItem('wallet_priv_final_enc', JSON.stringify(vault_blob))
      localStorage.setItem('wallet_pub_jwk', JSON.stringify(pubJwk))
   
      
      setStatus('Splitting master key into shares...')
      
      // 3. Split the master key into shares
      const hexShares = await splitMasterKey(masterKey, totalShares, threshold)
     
      
      // Prepare shares for friends (simple format, no Schnorr commitments for now)
      const sharesForFriends = hexShares.map((shareHex, index) => ({
        id: index + 1,
        shareHex: shareHex,
        publicKeyY: '', // We'll skip this for simplicity
      }))
      
      setShareData(sharesForFriends)
      setStatus(`Wallet created. ${threshold} of ${totalShares} shares ready for distribution. Sending emails...`)

      // Prepare recipients payload
      const recipients = sharesForFriends.slice(0, totalShares).map((s, idx) => ({
        email: friendEmails[idx] || '',
        id: s.id,
        shareHex: s.shareHex,
        publicKeyY: s.publicKeyY,
      }))

      const resp = await sendSharesEmail({ recipients, fromEmail: senderEmail, username })
      if (resp.status === 'success') {
        // Persist vault to server so user can recover from other devices
        try {
          const saveResp = await saveVault(username, vault_blob)
          if (saveResp && saveResp.status === 'success') {
            setStatus(`Emails sent to ${resp.sent} friend(s). Vault saved to server. Setup complete!`)
          } else {
            setStatus(`Emails sent but vault save failed: ${saveResp && saveResp.message ? saveResp.message : 'unknown'}`)
          }
        } catch (err) {
          console.error('Save vault error', err)
          setStatus(`Emails sent but vault save failed: ${err.message}`)
        }
        // Redirect to login after 2 seconds
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setStatus(`Wallet created, but emailing failed: ${resp.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(error)
      setStatus('Wallet creation failed: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-4 relative">
      {/* Back Button - Top Left */}
      <button
        onClick={() => navigate('/login')}
        aria-label="Go back"
        className="fixed top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-slate-700 border border-gray-200 shadow-sm hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <span className="text-xl font-bold leading-none">&larr;</span>
      </button>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <h1 className="text-4xl font-extrabold text-green-800 mb-2">Setup Social Recovery</h1>
          <p className="text-green-700 text-lg">Protect Your Account with Trusted Friends</p>
          <p className="text-green-600 text-sm mt-2">
            Split your master key into shares and send them to friends. You'll need {threshold} of {totalShares} shares to recover your account.
          </p>
        </div>

        {/* --- WALLET SETUP --- */}
        <div className="p-6 border-2 border-green-200 rounded-xl shadow-lg bg-white">
          <h2 className="text-2xl font-bold mb-4 text-green-800 border-b-2 border-green-200 pb-2">
            Wallet Setup & Splitting
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2 text-green-700">Set Main Wallet Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure Password (Primary Lock)"
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2 text-green-700">Your Email (From)</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-semibold mb-2 text-green-700">Total Friends (N)</label>
              <input 
                type="number"
                value={totalShares}
                onChange={(e) => setTotalShares(parseInt(e.target.value, 10) || 3)}
                min="3"
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-semibold mb-2 text-green-700">Threshold (T)</label>
              <input 
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 2)}
                min="2"
                max={totalShares}
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
          </div>

          {/* Friend emails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {Array.from({ length: totalShares }).map((_, idx) => (
              <div key={idx}>
                <label className="block text-sm font-semibold mb-2 text-green-700">Friend {idx + 1} Email</label>
                <input
                  type="email"
                  value={friendEmails[idx] || ''}
                  onChange={(e) => {
                    const next = [...friendEmails]
                    next[idx] = e.target.value
                    setFriendEmails(next)
                  }}
                  placeholder={`friend${idx + 1}@example.com`}
                  className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
                />
              </div>
            ))}
          </div>
          
          <Button 
            onClick={handleCreateWallet} 
            disabled={!password || shareData}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            Create & Split Key ({threshold} of {totalShares})
          </Button>
        </div>

        {/* --- SHARE DISTRIBUTION --- */}
        {shareData && (
          <div className="p-6 border-2 border-green-300 bg-green-50 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold mb-3 text-green-800 border-b-2 border-green-300 pb-2">
              Shares Generated & Sent
            </h3>
            <p className="text-sm mb-4 text-green-700 font-medium">
              Each friend has received their unique secret share via email. They should keep it safe and private.
            </p>
            
            <div className="space-y-3">
              {shareData.map(share => (
                <div key={share.id} className="p-4 border-2 border-green-200 rounded-lg bg-white shadow-sm">
                  <p className="font-bold text-green-800 mb-2">Friend Share ID: {share.id}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold text-green-700 text-sm">Secret Share (sent to friend):</span>
                      <p className="text-xs break-all mt-1 font-mono bg-green-50 p-2 rounded border border-green-200">
                        {share.shareHex}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-4 border-2 border-green-200 rounded-xl bg-white shadow-sm">
          <div className="text-sm font-semibold text-green-700">Status:</div>
          <div className="text-base font-medium text-green-800 mt-1">
            {status || 'Fill in the details above to set up social recovery...'}
          </div>
        </div>
      </div>
    </div>
  )
}
