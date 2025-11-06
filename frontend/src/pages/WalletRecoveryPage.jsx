import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {  finalRecoveryStep } from '../lib/wallet_recovery'
import { reconstructMasterKey } from '../lib/sss'
import { requestChallenge, verifyLogin } from '../utils/api'
import { computePublicY, generateProof } from '../utils/zkp'

const Button = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-all ${className}`}
  >
    {children}
  </button>
)

export default function WalletRecoveryPage() {
  const navigate = useNavigate()
  const [status, setStatus] = React.useState('')
  const [threshold, setThreshold] = React.useState(2)
  const [recoveryProofs, setRecoveryProofs] = React.useState([])
  const [recoveryShareInput, setRecoveryShareInput] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [recoveredKey, setRecoveredKey] = React.useState(null)
  const [isRecovered, setIsRecovered] = React.useState(false)

  const handleFriendSubmitProof = async () => {
    if (recoveryProofs.length >= threshold) {
      return setStatus('Threshold already met. Proceed to final recovery.')
    }

    if (!recoveryShareInput.trim()) {
      return setStatus('Please enter a secret share.')
    }

    setStatus('Validating share format...')

    try {
      const cleanedShare = recoveryShareInput.trim().replace(/\s+/g, '')
      if (!/^[0-9a-fA-F]+$/.test(cleanedShare)) {
        return setStatus('Invalid share format. Share must be a hexadecimal string (0-9, a-f).')
      }

      if (cleanedShare.length % 2 !== 0) {
        return setStatus('Invalid share length. Share must have even number of characters.')
      }

      if (cleanedShare.length < 50 || cleanedShare.length > 100) {
        setStatus('Warning: Share length seems unusual. Expected 50-100 hex characters. Continue anyway?')
      }

      const alreadyCollected = recoveryProofs.some(p => p.shareHex === cleanedShare)
      if (alreadyCollected) {
        return setStatus('This share was already collected.')
      }

      setRecoveryProofs(prev => [...prev, { shareHex: cleanedShare }])
      setStatus(`Share accepted! Collected ${recoveryProofs.length + 1} of ${threshold} shares.`)
      setRecoveryShareInput('')
    } catch (error) {
      console.error(error)
      setStatus('Error processing share: ' + error.message)
    }
  }

  const handleFinalRecovery = async () => {
    if (recoveryProofs.length < threshold) {
      return setStatus('Not enough shares to start key reconstruction.')
    }

    if (!username) {
      return setStatus('Please enter your username.')
    }

    const sharesToCombine = recoveryProofs.map(p => p.shareHex)

    setStatus('Reconstructing Master Key via Shamir\'s Secret Sharing...')

    try {
      console.log('🔍 Attempting to reconstruct key with shares:', sharesToCombine)
      const recoveredMasterKey = await reconstructMasterKey(sharesToCombine)
      console.log('Master key reconstructed successfully')

      setStatus('Decrypting wallet with recovered key...')
      await finalRecoveryStep(recoveredMasterKey)
      console.log('Wallet decrypted successfully')

      setRecoveredKey(recoveredMasterKey)
      setIsRecovered(true)
      setStatus('Key Recovered! Now logging you in...')

      await autoLogin(username, recoveredMasterKey)

    } catch (error) {
      console.error('Recovery Error:', error)
      setStatus(`Recovery Failed: ${error.message || 'The shares may be incorrect or corrupted.'}`)
    }
  }

  const autoLogin = async (username, recoveredMasterKey) => {
    try {
      setStatus('Requesting challenge from server...')
      const challenge = await requestChallenge(username)
      if (challenge.status !== 'success') {
        return setStatus(challenge.message || 'Challenge request failed')
      }

      const keyBuffer = await crypto.subtle.exportKey('raw', recoveredMasterKey)
      const rootKey = new Uint8Array(keyBuffer)
      const { x } = await computePublicY(rootKey)
      const { R, s } = await generateProof(x, challenge.c)

      setStatus('Verifying proof and logging in...')
      const result = await verifyLogin({
        username,
        challenge_id: challenge.challenge_id,
        R,
        s,
      })

      if (result.status === 'success') {
        setStatus('Login successful! Redirecting to dashboard...')
        localStorage.setItem('session_token', result.session_token)
        localStorage.setItem('current_user', username)
        localStorage.setItem('isLoggedIn', 'true')
        window.dispatchEvent(new Event('login-success'))
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        setStatus('Login failed: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Auto-login: Error occurred:', error)
      setStatus('Auto-login failed: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-4 relative">
      <button
        onClick={() => navigate('/homepage')}
        aria-label="Go back"
        className="fixed top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-green-100 text-green-700 border border-green-200 shadow-sm hover:bg-green-200 active:bg-green-300 transition-colors"
      >
        <span className="text-xl font-bold leading-none">&larr;</span>
      </button>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <h1 className="text-4xl font-extrabold text-green-800 mb-2">Recover Your Account</h1>
          <p className="text-green-700 text-lg">Use Secret Shares from Your Trusted Friends</p>
          <p className="text-green-600 text-sm mt-2">
            Enter {threshold} secret shares to reconstruct your master key and regain access.
          </p>
        </div>

        <div className="p-6 border-2 border-green-200 rounded-xl shadow-lg bg-white">
          <h3 className="text-2xl font-bold mb-4 text-green-800 border-b-2 border-green-200 pb-2">
            Enter Your Username & Secret Shares
          </h3>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-green-700">Your Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-green-700">Secret Shares</label>
            <p className="text-sm mb-3 text-green-600">
              Ask your trusted friends for the secret shares they received via email. Enter them one by one below.
            </p>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-800 mb-2">📋 How to paste shares:</p>
              <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                <li>Copy the entire hex string from your friend's email</li>
                <li>Paste it exactly as received (spaces and line breaks will be removed automatically)</li>
                <li>The share should look like: <code className="bg-white px-1 rounded">a3f5e8b2c1d4...</code></li>
                <li>Each share is unique - you need {threshold} different shares</li>
              </ul>
            </div>

            <textarea
              value={recoveryShareInput}
              onChange={(e) => setRecoveryShareInput(e.target.value)}
              placeholder="Paste a friend's Secret Share here (hex string)"
              rows={3}
              className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full mb-3 outline-none transition-all font-mono text-sm"
            />
            <Button 
              onClick={handleFriendSubmitProof} 
              disabled={!recoveryShareInput}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Add Share ({recoveryProofs.length}/{threshold})
            </Button>
          </div>

          <div className="pt-6 border-t-2 border-green-200">
            <h4 className="font-semibold text-lg mb-3 text-green-700">Collected Shares</h4>

            {recoveryProofs.length > 0 && (
              <div className="mb-4 space-y-2">
                {recoveryProofs.map((proof, idx) => (
                  <div key={idx} className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Share {idx + 1}:</p>
                    <p className="text-xs font-mono text-green-700 break-all">
                      {proof.shareHex.substring(0, 40)}...
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="text-base mb-4 font-medium text-green-800">
              Shares Collected: <span className="text-green-600 font-bold">{recoveryProofs.length}</span> / {threshold} required
            </div>

            {recoveryProofs.length >= threshold ? (
              <Button 
                onClick={handleFinalRecovery}
                disabled={!username}
                className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Reconstruct Key & Auto-Login
              </Button>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Need {threshold - recoveryProofs.length} more share(s) to proceed
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 border-2 border-green-200 rounded-xl bg-white shadow-sm">
          <div className="text-sm font-semibold text-green-700">Status:</div>
          <div className="text-base font-medium text-green-800 mt-1">
            {status || 'Enter secret shares from your friends to begin recovery...'}
          </div>
        </div>
      </div>
    </div>
  )
}
