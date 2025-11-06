import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, Sun, Moon, ArrowLeft, User, LogIn } from 'lucide-react';
import { deriveRootKey } from '@/utils/kdf';
import { computePublicY, generateProof } from '@/utils/zkp';
import { requestChallenge, verifyLogin } from '@/utils/api';
import { decryptBackup } from '@/utils/backup';

export default function Login({ onLoginSuccess }) {  
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false); 
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    const { username, password } = formData;
    if (!username || !password) return setStatus('Please enter your credentials');
    

    try {
      setStatus('Requesting challenge...');
      const challenge = await requestChallenge(username);
      if (challenge.status !== 'success')
        return setStatus(challenge.message || 'Challenge request failed');

      // Retrieve KDF data (prefer localStorage, fallback to challenge)
let salt_kdf = localStorage.getItem(`salt_kdf_${username}`);
let kdf_params = JSON.parse(localStorage.getItem(`kdf_params_${username}`) || 'null');

// Fallback to challenge-provided KDF data
if (!salt_kdf || !kdf_params) {
  salt_kdf = challenge.salt_kdf || salt_kdf;
  kdf_params = challenge.kdf_params || kdf_params;
}

// Default to scrypt if KDF type not specified (backward compatibility)
if (!kdf_params || !kdf_params.kdf) {
  kdf_params = {
    kdf: 'scrypt',
    N: 16384, // cost factor
    r: 8,
    p: 1,
    dkLen: 32,
  };
}

if (!salt_kdf) return setStatus('No salt found. Please re-register.');

      // Convert base64 salt to Uint8Array
      const saltBytes = Uint8Array.from(atob(salt_kdf), c => c.charCodeAt(0));

      setStatus('Deriving root key...');
      const rootKey = await deriveRootKey(password, saltBytes, kdf_params);

      let x;
      try {
        const computed = await computePublicY(rootKey);
        x = computed.x;
      } catch (err) {
        x = null;
      }

      if (!x) {
        setStatus('Fetching encrypted backup...');
        let encrypted = challenge.encrypted_backup;
        if (!encrypted) {
          const res = await fetch(`${process.env.REACT_APP_API_BASE || 'http://localhost:5000'}/auth/backup?username=${encodeURIComponent(username)}`);
          const jb = await res.json();
          if (jb.status !== 'success') throw new Error(jb.message || 'Failed to fetch backup');
          encrypted = jb.encrypted_backup;
        }
        if (!encrypted) throw new Error('No encrypted backup available');

        const decryptedHex = await decryptBackup(rootKey, encrypted);
        x = BigInt('0x' + decryptedHex);
      }
      const zkpStart = performance.now();
      const { R, s } = await generateProof(x, challenge.c);

      setStatus('Verifying proof...');
      const result = await verifyLogin({
        username,
        challenge_id: challenge.challenge_id,
        R,
        s,
      });
      

      const zkpEnd = performance.now();
const zkpTime = (zkpEnd - zkpStart).toFixed(2);
console.log(`🔐 ZKP (proof generation + verification) took ${zkpTime} ms (${(zkpTime / 1000).toFixed(2)} seconds)`);


      if (result.status === 'success') {
        setStatus('Login successful!');
        localStorage.setItem('session_token', result.session_token);
        localStorage.setItem('current_user', username);
        sessionStorage.setItem('temp_password', password);
        
        if (challenge.salt_kdf && challenge.kdf_params) {
          localStorage.setItem(`salt_kdf_${username}`, challenge.salt_kdf);
          localStorage.setItem(`kdf_params_${username}`, JSON.stringify(challenge.kdf_params));
        }

        if (onLoginSuccess) onLoginSuccess();


        setTimeout(() => navigate('/dashboard'), 1000); 
      } else {
        setStatus(result.message || 'Login failed');
      }

    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-black' 
        : 'bg-gradient-to-b from-gray-50 via-white to-gray-100'
    }`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {darkMode ? (
          <>
            <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
          </>
        ) : (
          <>
            <div className="absolute top-20 left-20 w-96 h-96 bg-green-300 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-20"></div>
          </>
        )}
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-6 right-6 p-2 rounded-lg transition z-50 ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Back to Home */}
      <button
        onClick={() => navigate('/')}
        className={`fixed top-6 left-6 p-2 rounded-lg transition z-50 ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-md relative z-10">
        <div className={`rounded-2xl shadow-2xl p-8 transition-colors ${
          darkMode ? 'bg-gray-800 border border-blue-500 border-opacity-20' : 'bg-white'
        }`}>
          <div className="flex items-center justify-center mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>

          <h2 className={`text-3xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome Back
          </h2>
          <p className={`text-center mb-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Sign in to access your secure vault
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Username or Email
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none ${
                    darkMode ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500' : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Master Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full pl-11 pr-11 py-3 rounded-xl transition-all outline-none ${
                    darkMode ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500' : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-3.5 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className={`rounded-xl p-4 text-sm flex items-start gap-2 ${
              darkMode ? 'bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 text-blue-300' : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                Your login is verified using zero-knowledge proofs. Your password never leaves your device.
              </span>
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>

            {status && (
              <p className={`mt-4 text-sm font-medium text-center transition-all ${
                status.toLowerCase().includes('error') || status.toLowerCase().includes('fail')
                  ? darkMode ? 'text-red-400' : 'text-red-600'
                  : status.toLowerCase().includes('success')
                  ? darkMode ? 'text-green-400' : 'text-green-600'
                  : darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {status}
              </p>
            )}
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/wallet-recovery')}
              className={`text-sm font-medium transition-colors ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-green-600 hover:text-green-700'
              }`}
            >
              Forgot your password? <span className="underline">Recover with social recovery</span>
            </button>
          </div>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/register')}
              className={`text-sm font-semibold transition-colors ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-green-600 hover:text-green-700'
              }`}
            >
              Don't have an account? <span className="underline">Create one</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
