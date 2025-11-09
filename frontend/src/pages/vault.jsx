import { getVault, logout, updateVault, saveVault } from '@/utils/api';
import { deriveRootKey } from '@/utils/kdf';
import { decryptVault, deriveVaultKey, encryptVault } from '@/utils/vault';
import {
  Check,
  Copy,
  CreditCard,
  Eye, EyeOff,
  Globe,
  Home,
  Key,
  LogOut,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Shield, Sun,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // REAL VAULT DATA - replace mock
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState({
    name: '',
    username: '',
    password: '',
    website: '',
    category: 'other',
    notes: ''
  });

  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordPromptValue, setPasswordPromptValue] = useState('');

  // Password Generator State
  const [generatorConfig, setGeneratorConfig] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Load vault data on component mount
  useEffect(() => {
    loadVaultData();
  }, []);

  // --- UPDATED: loadVaultData now prefers encrypted vault_blob only
  const loadVaultData = async () => {
    try {
      setLoading(true);
      const sessionToken = localStorage.getItem('session_token');
      let username = localStorage.getItem('current_user') || '';
      const normalizedUsername = username.trim().toLowerCase();
      username = normalizedUsername; // ensure uniform use


      console.log('Loading vault for user:', username);
      console.log('All localStorage keys:', Object.keys(localStorage));

      if (!sessionToken || !username) {
        navigate('/login');
        return;
      }

      // Fetch encrypted vault from server
      let vaultResponse;
      try {
        vaultResponse = await getVault();
        console.log('Vault response:', vaultResponse);
      } catch (e) {
        console.error('Failed to call getVault:', e);
        setPasswords([]);
        return;
      }

      if (!vaultResponse || vaultResponse.status !== 'success' || !vaultResponse.vault_blob) {
        console.log('No vault blob found, starting with empty vault');
        setPasswords([]);
        return;
      }

      // Get stored keys for decryption
      const salt_kdf = localStorage.getItem(`salt_kdf_${normalizedUsername}`);
      const raw = localStorage.getItem(`kdf_params_${normalizedUsername}`);

      const kdf_params = raw ? JSON.parse(raw) : null;
      const password = sessionStorage.getItem('temp_password');

      console.log('Retrieved decryption data:', {
        username,
        salt_kdf: salt_kdf ? 'EXISTS' : 'MISSING',
        kdf_params,
        password: password ? 'EXISTS' : 'MISSING'
      });

      if (!salt_kdf || !kdf_params || !password) {
        console.warn('Missing decryption data:', {
          hasSalt: !!salt_kdf,
          hasKdfParams: !!kdf_params,
          hasPassword: !!password
        });
        setShowPasswordPrompt(true);
        return;
      }

      // Derive keys and decrypt
      const saltBytes = Uint8Array.from(atob(salt_kdf), c => c.charCodeAt(0));
      const rootKey = await deriveRootKey(password, saltBytes, kdf_params);
      const vaultKey = await deriveVaultKey(rootKey, username);

      const decryptedVault = await decryptVault(vaultResponse.vault_blob, vaultKey, username);

      // Set the actual passwords from vault
      setPasswords(decryptedVault.passwords || []);

    } catch (error) {
      console.error('Failed to load vault:', error);
      setPasswords([]);
    } finally {
      setLoading(false);
    }
  };

  // In your vault.jsx, update the updateVaultOnServer function:
  const updateVaultOnServer = async (updatedPasswords) => {
    try {
      let username = localStorage.getItem('current_user') || '';
      const normalizedUsername = username.trim().toLowerCase();
      username = normalizedUsername;

      console.log('Current username:', username);

      // Debug: List all localStorage keys to see what's available
      console.log('All localStorage keys:', Object.keys(localStorage));

      // Try different case variations to find the salt and KDF params
      let salt_kdf = localStorage.getItem(`salt_kdf_${username}`);
      let raw = localStorage.getItem(`kdf_params_${username}`);

      // If not found, try case-insensitive matching
      if (!salt_kdf && username) {
        const availableSaltKeys = Object.keys(localStorage).filter(key => key.includes('salt'));
        const matchingSaltKey = availableSaltKeys.find(key =>
          key.toLowerCase() === `salt_kdf_${username}`.toLowerCase()
        );
        if (matchingSaltKey) {
          salt_kdf = localStorage.getItem(matchingSaltKey);
          // Extract the actual username from the key for KDF params lookup
          const actualUsername = matchingSaltKey.replace('salt_kdf_', '');
          raw = localStorage.getItem(`kdf_params_${actualUsername}`);
          console.log('Found matching salt key:', matchingSaltKey, 'with username:', actualUsername);
          username = actualUsername; // Update to the actual username case for consistency
        }
      }

      const kdf_params = raw ? JSON.parse(raw) : null;
      const password = sessionStorage.getItem('temp_password');

      console.log('Retrieved data:', {
        username,
        salt_kdf: salt_kdf ? 'EXISTS' : 'MISSING',
        kdf_params,
        password: password ? 'EXISTS' : 'MISSING'
      });

      // Enhanced error checking
      if (!password) {
        return {
          success: false,
          code: 'MISSING_TEMP_PASSWORD',
          error: 'Session expired. Please refresh the page.'
        };
      }

      if (!salt_kdf) {
        // More specific error to help debug
        const availableSaltKeys = Object.keys(localStorage).filter(key => key.includes('salt'));
        console.error('Available salt keys in localStorage:', availableSaltKeys);
        return {
          success: false,
          code: 'MISSING_SALT',
          error: `Salt not found for user ${username}. Available salt keys: ${availableSaltKeys.join(', ')}`
        };
      }

      if (!kdf_params) {
        const availableKdfKeys = Object.keys(localStorage).filter(key => key.includes('kdf'));
        console.error('Available KDF keys in localStorage:', availableKdfKeys);
        return {
          success: false,
          code: 'MISSING_KDF_PARAMS',
          error: `KDF params not found for user ${username}. Available KDF keys: ${availableKdfKeys.join(', ')}`
        };
      }

      // Convert salt from base64 to Uint8Array
      const saltBytes = Uint8Array.from(atob(salt_kdf), c => c.charCodeAt(0));
      console.log('Salt bytes converted, length:', saltBytes.length);

      const rootKey = await deriveRootKey(password, saltBytes, kdf_params);
      const vaultKey = await deriveVaultKey(rootKey, username);

      // Rest of your function remains the same...
      let base = { passwords: [], wallet: null };
      try {
        const latest = await getVault();
        if (latest && latest.status === 'success' && latest.vault_blob) {
          try {
            const serverVault = await decryptVault(latest.vault_blob, vaultKey, username);
            base = serverVault || base;
          } catch (e) {
            console.warn('Could not decrypt server vault; will overwrite with client state.', e);
          }
        }
      } catch (e) {
        console.warn('Network error during merge attempt, continuing with local data');
      }

      const updatedVault = {
        ...base,
        passwords: updatedPasswords,
        updated_at: new Date().toISOString()
      };

      const vault_blob = await encryptVault(updatedVault, vaultKey, username);
      const updateResponse = await updateVault(vault_blob);

      if (!updateResponse || updateResponse.status !== 'success') {
        const err = updateResponse?.message || 'Unknown server error';
        return { success: false, error: String(err) };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update vault:', error);
      return { success: false, error: error.message || String(error) };
    }
  };
  // --- UPDATED: handleAddPassword now uses updateVaultOnServer instead of addPlainEntry
  const handleAddPassword = async () => {
    const newPasswordEntry = {
      id: Date.now(),
      ...newPassword,
      favorite: false,
      lastModified: new Date().toISOString().split('T')[0],
      strength: 'medium'
    };

    const updatedPasswords = [...passwords, newPasswordEntry];
    // Close modal immediately (optimistic UX), add locally and attempt to persist. If persist fails mark as pending
    setShowAddModal(false);
    setPasswords(updatedPasswords);

    try {
      const res = await updateVaultOnServer(updatedPasswords);
      if (!res.success) {
        setPasswords(prev => prev.map(p => p.id === newPasswordEntry.id ? { ...p, pending: true } : p));
        setSaveError(res.error || 'Failed to save to vault');
      } else {
        setNewPassword({
          name: '',
          username: '',
          password: '',
          website: '',
          category: 'other',
          notes: ''
        });
        setSaveError(null);
      }
    } catch (err) {
      setPasswords(prev => prev.map(p => p.id === newPasswordEntry.id ? { ...p, pending: true } : p));
      setSaveError(err.message || 'Network error while saving to vault');
    }
  };

  // Retry syncing any pending entries (attempts to upload the full vault again)
  const syncPendingPasswords = async () => {
    const pending = passwords.some(p => p.pending);
    if (!pending) return;
    const updated = passwords.map(p => { const cp = { ...p }; delete cp.pending; return cp; });
    const result = await updateVaultOnServer(updated);
    if (result.success) {
      setPasswords(updated);
      setSaveError(null);
    } else {
      setSaveError(result.error || 'Sync failed');
    }
  };

  const toggleFavorite = async (id) => {
    const updatedPasswords = passwords.map(p =>
      p.id === id ? { ...p, favorite: !p.favorite } : p
    );
    setPasswords(updatedPasswords);

    await updateVaultOnServer(updatedPasswords);
  };

  // UI helper functions
  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generatePassword = () => {
    let charset = '';
    if (generatorConfig.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (generatorConfig.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (generatorConfig.numbers) charset += '0123456789';
    if (generatorConfig.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    for (let i = 0; i < generatorConfig.length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
  };

  // Categories
  const categories = [
    { id: 'all', name: 'All Items', icon: Key, count: passwords.length },
    { id: 'email', name: 'Email', icon: Mail, count: passwords.filter(p => p.category === 'email').length },
    { id: 'social', name: 'Social Media', icon: Globe, count: passwords.filter(p => p.category === 'social').length },
    { id: 'financial', name: 'Financial', icon: CreditCard, count: passwords.filter(p => p.category === 'financial').length },
    { id: 'entertainment', name: 'Entertainment', icon: Globe, count: passwords.filter(p => p.category === 'entertainment').length },
  ];

  // Filter passwords
  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'weak': return darkMode ? 'text-red-400' : 'text-red-600';
      case 'medium': return darkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'strong': return darkMode ? 'text-green-400' : 'text-green-600';
      default: return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'email': return Mail;
      case 'social': return Globe;
      case 'financial': return CreditCard;
      default: return Key;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading your vault...
          </p>
        </div>
      </div>
    );
  }

  // Normal dashboard content when not loading
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>

      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${darkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
        }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          {saveError && (
            <div className="mb-2">
              <div className="rounded-md p-3 bg-yellow-50 border border-yellow-200 flex items-center justify-between">
                <div className="text-sm text-yellow-800">{saveError}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => syncPendingPasswords()} className="px-3 py-1 bg-yellow-600 text-white rounded">Retry</button>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                }`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ZeroVault
                </h1>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Password Manager
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition ${darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Upload local wallet to server (small button on profile/header) */}
              <button
                onClick={async () => {
                  try {
                    const username = (localStorage.getItem('current_user') || '').trim().toLowerCase();
                    if (!username) {
                      alert('No current user found in localStorage');
                      return;
                    }
                    const encRaw = localStorage.getItem('wallet_priv_final_enc');
                    if (!encRaw) {
                      alert('No local wallet found to upload');
                      return;
                    }
                    let vault_blob;
                    try {
                      vault_blob = JSON.parse(encRaw);
                    } catch (e) {
                      alert('Failed to parse local wallet blob');
                      return;
                    }
                    const resp = await saveVault(username, vault_blob);
                    if (resp && resp.status === 'success') {
                      alert('Local wallet uploaded to server successfully');
                      setSaveError(null);
                    } else {
                      alert('Upload failed: ' + (resp && resp.message ? resp.message : 'unknown'));
                    }
                  } catch (err) {
                    console.error('Upload vault error', err);
                    alert('Upload failed: ' + (err.message || err));
                  }
                }}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${darkMode
                    ? 'bg-blue-600 bg-opacity-10 hover:bg-opacity-20 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v8m0-8l3 3m-3-3-3 3M12 3v9" />
                </svg>
                <span className="text-sm font-semibold hidden sm:block">Upload</span>
              </button>

              <button
                onClick={() => navigate('/')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${darkMode
                    ? 'bg-gray-700 bg-opacity-10 hover:bg-opacity-20 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-semibold">Home</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    console.warn('Logout request failed:', e);
                  }
                  // Clear session storage and known session keys then redirect to login
                  try {
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('session_user');
                    localStorage.removeItem('current_user');
                    localStorage.removeItem('vault_enc');
                    localStorage.removeItem('wallet_priv_enc');
                  } catch {
                    // ignore
                  }
                  navigate('/login');
                }}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${darkMode
                    ? 'bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-400'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                  }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Password re-entry modal for missing temp password */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-lg font-semibold mb-2">Re-enter Master Password</h3>
            <p className="text-sm mb-4">To save pending items we need your master password for key derivation. This is stored only in your session.</p>
            <input type="password" value={passwordPromptValue} onChange={(e) => setPasswordPromptValue(e.target.value)} className="w-full px-3 py-2 rounded mb-4" placeholder="Master password" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPasswordPrompt(false)} className="px-3 py-2 rounded bg-gray-200">Cancel</button>
              <button onClick={async () => {
                // Save to session and attempt to decrypt and sync
                sessionStorage.setItem('temp_password', passwordPromptValue);
                setShowPasswordPrompt(false);
                // Reload vault data (which will decrypt with the provided password)
                try {
                  await loadVaultData();
                } catch (e) {
                  console.error('Failed to load vault after re-entering password', e);
                }
                // Then try to sync pending entries
                await syncPendingPasswords();
                setPasswordPromptValue('');
              }} className="px-3 py-2 rounded bg-blue-600 text-white">Save & Retry</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
              <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${selectedCategory === cat.id
                          ? darkMode
                            ? 'bg-blue-500 bg-opacity-20 text-blue-400'
                            : 'bg-green-100 text-green-700'
                          : darkMode
                            ? 'text-gray-400 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === cat.id
                          ? darkMode ? 'bg-blue-500' : 'bg-green-500'
                          : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                        } text-white`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">

            {/* Search & Actions Bar */}
            <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search passwords..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg outline-none transition ${darkMode
                        ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                        : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                      }`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPasswordGenerator(true)}
                    className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 ${darkMode
                        ? 'bg-purple-500 bg-opacity-20 hover:bg-opacity-30 text-purple-400'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                      }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-semibold hidden sm:block">Generate</span>
                  </button>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 ${darkMode
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      } text-white font-semibold shadow-lg`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Password</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPasswords.map(item => {
                const CategoryIcon = getCategoryIcon(item.category);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-5 transition-all hover:scale-[1.02] ${darkMode
                        ? 'bg-gray-800 border border-gray-700 hover:border-blue-500'
                        : 'bg-white border border-gray-200 hover:border-green-500 hover:shadow-lg'
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          }`}>
                          <CategoryIcon className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.name}
                          </h3>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.website}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`text-xl transition ${item.favorite
                            ? 'text-yellow-500'
                            : darkMode ? 'text-gray-600 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-500'
                          }`}
                      >
                        ★
                      </button>
                    </div>

                    {/* Username */}
                    <div className="mb-3">
                      <label className={`text-xs font-semibold mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item.username}
                        </p>
                        <button
                          onClick={() => copyToClipboard(item.username, `user-${item.id}`)}
                          className={`p-1.5 rounded transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                        >
                          {copiedId === `user-${item.id}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                      <label className={`text-xs font-semibold mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Password
                      </label>
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {visiblePasswords.has(item.id) ? item.password : '••••••••••••'}
                        </p>
                        <button
                          onClick={() => togglePasswordVisibility(item.id)}
                          className={`p-1.5 rounded transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                        >
                          {visiblePasswords.has(item.id) ? (
                            <EyeOff className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          ) : (
                            <Eye className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.password, `pass-${item.id}`)}
                          className={`p-1.5 rounded transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                        >
                          {copiedId === `pass-${item.id}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${getStrengthColor(item.strength)}`}>
                          Strength: {item.strength}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Modified: {item.lastModified}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {/* UPDATED: Delete handler with encrypted vault first, plaintext fallback */}
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this password?')) return;
                          // Optimistic UI update
                          const prev = passwords;
                          const updated = passwords.filter(p => p.id !== item.id);
                          setPasswords(updated);
                          try {
                            // Try encrypted-vault persist first (preferred)
                            const result = await updateVaultOnServer(updated);
                            if (!result.success) {
                              // ...existing code...
                            }
                          } catch (e) {
                            setPasswords(prev);
                            alert('Network error while deleting entry');
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium ${darkMode
                            ? 'bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-400'
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                          }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredPasswords.length === 0 && (
              <div className={`rounded-xl p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                <Shield className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  No passwords found
                </h3>
                <p className={`text-sm mb-6 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {searchQuery ? 'Try a different search term' : 'Add your first password to get started'}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className={`px-6 py-3 rounded-lg font-semibold ${darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    } text-white`}
                >
                  Add Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Password Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add New Password
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddPassword(); }} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Service Name
                </label>
                <input
                  type="text"
                  value={newPassword.name}
                  onChange={(e) => setNewPassword({ ...newPassword, name: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="e.g., Gmail"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username/Email
                </label>
                <input
                  type="text"
                  value={newPassword.username}
                  onChange={(e) => setNewPassword({ ...newPassword, username: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="username@example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  type="text"
                  value={newPassword.password}
                  onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={newPassword.website}
                  onChange={(e) => setNewPassword({ ...newPassword, website: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={newPassword.category}
                  onChange={(e) => setNewPassword({ ...newPassword, category: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                >
                  <option value="email">Email</option>
                  <option value="social">Social Media</option>
                  <option value="financial">Financial</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition ${darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-white ${darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    }`}
                >
                  Add Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Generator Modal */}
      {showPasswordGenerator && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Password Generator
              </h2>
              <button
                onClick={() => setShowPasswordGenerator(false)}
                className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Generated Password Display */}
            <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
              <div className="flex items-center justify-between">
                <p className={`font-mono text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {generatedPassword || 'Click generate'}
                </p>
                <button
                  onClick={() => copyToClipboard(generatedPassword, 'generated')}
                  className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                    }`}
                >
                  {copiedId === 'generated' ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Length Slider */}
            <div className="mb-6">
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Length: {generatorConfig.length}
              </label>
              <input
                type="range"
                min="8"
                max="32"
                value={generatorConfig.length}
                onChange={(e) => setGeneratorConfig({ ...generatorConfig, length: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {[
                { key: 'uppercase', label: 'Uppercase (A-Z)' },
                { key: 'lowercase', label: 'Lowercase (a-z)' },
                { key: 'numbers', label: 'Numbers (0-9)' },
                { key: 'symbols', label: 'Symbols (!@#$...)' }
              ].map(option => (
                <label key={option.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generatorConfig[option.key]}
                    onChange={(e) => setGeneratorConfig({ ...generatorConfig, [option.key]: e.target.checked })}
                    className={`w-4 h-4 rounded focus:ring-2 ${darkMode ? 'text-blue-600 focus:ring-blue-500' : 'text-green-600 focus:ring-green-500'
                      }`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {/* Generate Button */}
            <button
              onClick={generatePassword}
              className={`w-full px-4 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 ${darkMode
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                }`}
            >
              <RefreshCw className="w-5 h-5" />
              Generate Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}