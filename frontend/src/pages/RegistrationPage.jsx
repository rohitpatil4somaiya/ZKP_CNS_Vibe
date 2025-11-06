import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Key, Eye, EyeOff, Shield, Mail, CheckCircle, Sun, Moon, ArrowLeft, User } from 'lucide-react';
import { deriveRootKey } from '@/utils/kdf';
import { computePublicY } from '@/utils/zkp';
import { encryptBackup } from '@/utils/backup';
import { register } from '@/utils/api';

export default function Register() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (value.length >= 12) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^a-zA-Z0-9]/.test(value)) strength++;
      setPasswordStrength(strength);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 4) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    const { email, username, password, confirmPassword } = formData;

    if (!username) return setStatus('Please enter a username');
    if (!password || password.length < 8)
      return setStatus('Password must be at least 8 characters');
    if (password !== confirmPassword) return setStatus('Passwords do not match');

    try {
      setStatus('Generating scrypt root key...');

// Normalize username
const normalizedUsername = username.trim().toLowerCase();

// 1. Generate random salt
const saltArray = crypto.getRandomValues(new Uint8Array(16));
const saltBase64 = btoa(String.fromCharCode(...saltArray));

// 2. KDF params for scrypt
const kdf_params = {
  alg: 'scrypt',
  N: 16384,   // CPU/memory cost
  r: 8,       // block size
  p: 1,       // parallelization
  dkLen: 32   // derived key length (32 bytes = 256 bits)
};

// 3. Derive rootKey using scrypt
const saltBytes = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
const rootKey = await deriveRootKey(password, saltBytes, kdf_params);


      // 4. Compute publicY and x
      const { publicY, x } = await computePublicY(rootKey);

      // 5. Store locally for login recomputation
      localStorage.setItem(`salt_kdf_${normalizedUsername}`, saltBase64);
      localStorage.setItem(`kdf_params_${normalizedUsername}`, JSON.stringify(kdf_params));

      // 6. Create encrypted backup
      const encrypted_backup = await encryptBackup(rootKey, x.toString(16).padStart(64, '0'));

      // 7. Prepare payload
      const payload = {
        username: normalizedUsername,
        email,
        publicY,
        salt_kdf: saltBase64,
        kdf_params,
        encrypted_backup,
        vault_blob: null,
      };

      // 8. Call backend
      const res = await register(payload);

      if (res.status === 'success') {
        // Store current user for wallet setup
        localStorage.setItem('current_user', normalizedUsername);
        setStatus('Registration successful! Redirecting to wallet setup...');
        setTimeout(() => navigate('/wallet-setup'), 1500);
      } else {
        setStatus(res.message || 'Registration failed');
      }
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode
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

      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-6 right-6 p-2 rounded-lg transition z-50 ${darkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <button
        onClick={() => navigate('/')}
        className={`fixed top-6 left-6 p-2 rounded-lg transition z-50 ${darkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-md relative z-10">
        <div className={`rounded-2xl shadow-2xl p-8 transition-colors ${darkMode
            ? 'bg-gray-800 border border-blue-500 border-opacity-20'
            : 'bg-white'
          }`}>
          <div className="flex items-center justify-center mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>

          <h2 className={`text-3xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Create Your Account
          </h2>
          <p className={`text-center mb-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Join ZeroVault - Your passwords, truly secure
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Username
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="Choose a username"
                />
              </div>
            </div>

            {/* Password */}
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
                  minLength={8}
                  className={`w-full pl-11 pr-11 py-3 rounded-xl transition-all outline-none ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="Enter master password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-3.5 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-2">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${i < passwordStrength ? getStrengthColor() : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${passwordStrength <= 2 ? 'text-red-500' : passwordStrength <= 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                    Password strength: {getStrengthText()}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <div className="relative">
                <Key className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full pl-11 pr-11 py-3 rounded-xl transition-all outline-none ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-3.5 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className={`rounded-xl p-4 text-sm flex items-start gap-2 ${darkMode ? 'bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 text-blue-300' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                Your password is never stored or sent to our servers. All encryption happens locally on your device.
              </span>
            </div>

            {/* Status Message */}
            {status && (
              <div className={`rounded-xl p-3 mt-2 text-sm font-semibold ${status.includes('successful') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {status}
              </div>
            )}

            {/* Submit Button */}
            <button
              
              type="submit"
              className={`w-full py-3.5 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${darkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}
            >
              <CheckCircle className="w-5 h-5" />
              Create Account
            </button>

</form>

{/* Sign In Link - outside the form */}
<div className="mt-6 text-center">
  <button
    onClick={() => navigate('/login')}
    className={`text-sm font-semibold transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-green-600 hover:text-green-700'}`}
  >
    Already have an account? <span className="underline">Sign in</span>
  </button>
</div>
        </div>
      </div>
    </div>
  );
}
