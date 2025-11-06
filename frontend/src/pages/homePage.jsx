import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, Zap, CheckCircle, ArrowRight, Menu, X, Sun, Moon } from 'lucide-react';


export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionUser, setSessionUser] = useState(null); // will read from `current_user` localStorage key


  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track session state from localStorage so the navbar can update when user logs in/out
  useEffect(() => {
    const loadSession = () => {
      const token = localStorage.getItem('session_token');
      // login stores username under `current_user`
      const user = localStorage.getItem('current_user') || localStorage.getItem('session_user');
      setSessionToken(token);
      setSessionUser(user);
    };
    loadSession();

    const onStorage = (e) => {
      if (e.key === 'session_token' || e.key === 'session_user' || e.key === 'current_user') loadSession();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };


  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };


  return (
    <div className={darkMode ? "bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white min-h-screen" : "bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900 min-h-screen"}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? darkMode 
            ? 'bg-gray-900 bg-opacity-95 backdrop-blur-md shadow-lg border-b border-blue-500 border-opacity-20' 
            : 'bg-white bg-opacity-95 backdrop-blur-md shadow-lg border-b border-green-200'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${
                darkMode ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent'
              }`}>
                ZeroVault
              </h1>
              <p className={`text-xs hidden sm:block ${darkMode ? 'text-blue-300' : 'text-green-600'}`}>Your Privacy, Our Proof</p>
            </div>
          </div>


          {/* Desktop Navigation */}
          <nav className={`hidden md:flex gap-8 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <button onClick={() => scrollToSection('features')} className={`transition ${darkMode ? 'hover:text-blue-400' : 'hover:text-green-600'}`}>Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className={`transition ${darkMode ? 'hover:text-blue-400' : 'hover:text-green-600'}`}>How It Works</button>
            <button onClick={() => scrollToSection('security')} className={`transition ${darkMode ? 'hover:text-blue-400' : 'hover:text-green-600'}`}>Security</button>
            
          </nav>


          {/* CTA Buttons & Dark Mode Toggle */}
          <div className="hidden md:flex gap-3 items-center">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {/* If a session exists, show username__ active instead of Register/Login */}
            {sessionToken ? (
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${darkMode ? 'text-blue-300 bg-gray-800 bg-opacity-20' : 'text-green-700 bg-green-100'}`}>
                  {sessionUser ? sessionUser : 'User'}
                </span>
              </div>
            ) : (
              <>
                <button onClick={() => navigate('/register')} className={`px-6 py-2 text-white rounded-lg transition font-semibold ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md'
                }`}>
                  Register
                </button>
                <button onClick={() => navigate('/login')} className={`px-6 py-2 rounded-lg transition font-semibold ${
                  darkMode 
                    ? 'border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:bg-opacity-10' 
                    : 'border-2 border-green-500 text-green-600 hover:bg-green-50'
                }`}>
                  Login
                </button>
              </>
            )}
          </div>


          {/* Mobile Menu Button */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>


        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={darkMode ? "md:hidden bg-gray-800 bg-opacity-90 backdrop-blur-md border-t border-blue-500 border-opacity-20" : "md:hidden bg-white border-t border-green-200 shadow-lg"}>
            <nav className="flex flex-col gap-4 p-6">
              <button onClick={() => scrollToSection('features')} className={`text-left transition ${darkMode ? 'hover:text-blue-400' : 'hover:text-green-600 text-gray-700'}`}>Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className={`text-left transition ${darkMode ? 'hover:text-blue-400' : 'hover:text-green-600 text-gray-700'}`}>How It Works</button>
              <button onClick={() => scrollToSection('security')} className={`text-left transition ${darkMode ? 'hover:text-blue-400' : 'hover:text-green-600 text-gray-700'}`}>Security</button>
             
              
              {/* Mobile Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button onClick={() => {
                  const token = localStorage.getItem('session_token');
                  if (token) navigate('/dashboard'); else navigate('/login');
                }}
                className={`w-full px-6 py-2 text-white rounded-lg mt-2 ${
                darkMode 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 shadow-md'
              }`}>
                Launch App
              </button>
            </nav>
          </div>
        )}
      </header>


      {/* Hero Section */}
      <section className="min-h-screen pt-20 pb-16 px-6 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
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


        <div className="max-w-4xl mt-2 mx-auto text-center relative z-10">
          <div className="mb-6 inline-block mt-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
              darkMode 
                ? 'bg-blue-500 bg-opacity-20 text-blue-300 border-blue-500 border-opacity-30' 
                : 'bg-green-100 text-green-700 border-green-300'
            }`}>
              🔐 Zero-Knowledge Authentication
            </span>
          </div>


          <h1 className={`text-6xl md:text-7xl font-bold mb-6 leading-tight ${darkMode ? '' : 'text-gray-900'}`}>
            Your Passwords,
            <span className={`block bg-clip-text text-transparent ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-400 to-purple-400' 
                : 'bg-gradient-to-r from-green-600 to-green-700'
            }`}>
              Never Exposed
            </span>
          </h1>


          <p className={`text-xl mb-6 max-w-2xl mx-auto leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            We prove you're you without ever seeing your password. Military-grade encryption keeps your vault locked on your device. Complete control. Complete privacy.
          </p>


          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button onClick={() => {
                const token = localStorage.getItem('session_token');
                if (token) navigate('/dashboard'); else navigate('/login');
              }} className={`px-8 py-4 text-white rounded-lg transition text-lg font-semibold shadow-lg flex items-center justify-center gap-2 ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            }`}>
              Start Protecting Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className={`px-8 py-4 border-2 rounded-lg transition text-lg font-semibold ${
              darkMode 
                ? 'border-purple-500 text-purple-300 hover:bg-purple-500 hover:bg-opacity-10' 
                : 'border-green-500 text-green-600 hover:bg-green-50'
            }`}>
              Watch Demo
            </button>
          </div>


          {/* Key Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
            <div className={`rounded-lg p-6 transition ${
              darkMode 
                ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-blue-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <Lock className={`w-8 h-8 mx-auto mb-3 ${darkMode ? 'text-blue-400' : 'text-green-600'}`} />
              <div className={`text-2xl font-bold mb-2 ${darkMode ? 'text-blue-300' : 'text-green-600'}`}>256-bit</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Military-Grade Encryption</div>
            </div>
            <div className={`rounded-lg p-6 transition ${
              darkMode 
                ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-purple-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <Eye className={`w-8 h-8 mx-auto mb-3 ${darkMode ? 'text-purple-400' : 'text-green-600'}`} />
              <div className={`text-2xl font-bold mb-2 ${darkMode ? 'text-purple-300' : 'text-green-600'}`}>Zero</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Password Exposure</div>
            </div>
            <div className={`rounded-lg p-6 transition ${
              darkMode 
                ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-pink-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <Shield className={`w-8 h-8 mx-auto mb-3 ${darkMode ? 'text-pink-400' : 'text-green-600'}`} />
              <div className={`text-2xl font-bold mb-2 ${darkMode ? 'text-pink-300' : 'text-green-600'}`}>Verified</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Proof-Based Security</div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section id="features" className={`py-20 px-6 ${darkMode ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-5xl md:text-6xl font-bold mb-4 ${darkMode ? '' : 'text-gray-900'}`}>
              Powerful Features,<br />
              <span className={`bg-clip-text text-transparent ${
                darkMode 
                  ? 'bg-gradient-to-r from-blue-400 to-purple-400' 
                  : 'bg-gradient-to-r from-green-600 to-green-700'
              }`}>
                Simple to Use
              </span>
            </h2>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Advanced security that works invisibly in the background
            </p>
          </div>


          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className={`group rounded-xl p-8 transition duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition ${
                darkMode 
                  ? 'bg-blue-500 bg-opacity-20 group-hover:bg-opacity-40' 
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Lock className={`w-8 h-8 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Password-Free Login</h3>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No more remembering complex passwords. We use advanced proof technology to verify who you are without ever asking for your password.
              </p>
            </div>


            {/* Feature 2 */}
            <div className={`group rounded-xl p-8 transition duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition ${
                darkMode 
                  ? 'bg-purple-500 bg-opacity-20 group-hover:bg-opacity-40' 
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Shield className={`w-8 h-8 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>End-to-End Encrypted</h3>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your vault is encrypted on your device with military-grade encryption. Even we can't see your passwords. Decryption happens only on your device.
              </p>
            </div>


            {/* Feature 3 */}
            <div className={`group rounded-xl p-8 transition duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-pink-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition ${
                darkMode 
                  ? 'bg-pink-500 bg-opacity-20 group-hover:bg-opacity-40' 
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <EyeOff className={`w-8 h-8 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Your Device, Your Data</h3>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                All encryption happens locally on your device. Your vault stays on your computer. We only store the locked box, never the key.
              </p>
            </div>


            {/* Feature 4 */}
            <div className={`group rounded-xl p-8 transition duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition ${
                darkMode 
                  ? 'bg-cyan-500 bg-opacity-20 group-hover:bg-opacity-40' 
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <CheckCircle className={`w-8 h-8 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Audit Trail</h3>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Every login is recorded. See who accessed your account and when. Complete transparency with immutable records for peace of mind.
              </p>
            </div>


            {/* Feature 5 */}
            <div className={`group rounded-xl p-8 transition duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition ${
                darkMode 
                  ? 'bg-green-500 bg-opacity-20 group-hover:bg-opacity-40' 
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Zap className={`w-8 h-8 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Lightning Fast</h3>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Encryption and authentication happen in milliseconds. Instant login, instant access. Security shouldn't slow you down.
              </p>
            </div>


            {/* Feature 6 */}
            <div className={`group rounded-xl p-8 transition duration-300 transform hover:scale-105 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition ${
                darkMode 
                  ? 'bg-yellow-500 bg-opacity-20 group-hover:bg-opacity-40' 
                  : 'bg-green-100 group-hover:bg-green-200'
              }`}>
                <Lock className={`w-8 h-8 ${darkMode ? 'text-white' : 'text-green-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Auto-Fill Passwords</h3>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Securely store and automatically fill your passwords. One-click login to any website. Security without the hassle.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section id="how-it-works" className={`py-20 px-6 ${darkMode ? '' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-5xl md:text-6xl font-bold mb-4 ${darkMode ? '' : 'text-gray-900'}`}>
              How It Works
            </h2>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Simple, elegant, and secure from start to finish
            </p>
          </div>


          <div className="space-y-8 max-w-3xl mx-auto">
            {/* Step 1 */}
            <div className="flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-2xl text-white shadow-lg ${
                darkMode 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                1
              </div>
              <div className={`rounded-lg p-6 flex-1 transition ${
                darkMode 
                  ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-blue-500 border-opacity-20 hover:border-opacity-50' 
                  : 'bg-white border border-green-200 hover:shadow-lg'
              }`}>
                <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-blue-300' : 'text-green-700'}`}>Create Your Account</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Choose a master password. We convert it into a cryptographic key using advanced algorithms. This key is used to prove your identity.
                </p>
              </div>
            </div>


            {/* Step 2 */}
            <div className="flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-2xl text-white shadow-lg ${
                darkMode 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                2
              </div>
              <div className={`rounded-lg p-6 flex-1 transition ${
                darkMode 
                  ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-purple-500 border-opacity-20 hover:border-opacity-50' 
                  : 'bg-white border border-green-200 hover:shadow-lg'
              }`}>
                <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-purple-300' : 'text-green-700'}`}>Store Your Passwords Securely</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Add your existing passwords to your vault. Everything is encrypted locally on your device using the strongest encryption available. Nothing ever leaves unencrypted.
                </p>
              </div>
            </div>


            {/* Step 3 */}
            <div className="flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-2xl text-white shadow-lg ${
                darkMode 
                  ? 'bg-gradient-to-br from-pink-500 to-pink-600' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                3
              </div>
              <div className={`rounded-lg p-6 flex-1 transition ${
                darkMode 
                  ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-pink-500 border-opacity-20 hover:border-opacity-50' 
                  : 'bg-white border border-green-200 hover:shadow-lg'
              }`}>
                <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-pink-300' : 'text-green-700'}`}>Login with Proof</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  When you log in, we send you a challenge. Your device generates a mathematical proof that you know the password without revealing it. It's like showing your driver's license without showing your full address.
                </p>
              </div>
            </div>


            {/* Step 4 */}
            <div className="flex gap-6 items-start animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-2xl text-white shadow-lg ${
                darkMode 
                  ? 'bg-gradient-to-br from-cyan-500 to-cyan-600' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                4
              </div>
              <div className={`rounded-lg p-6 flex-1 transition ${
                darkMode 
                  ? 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-cyan-500 border-opacity-20 hover:border-opacity-50' 
                  : 'bg-white border border-green-200 hover:shadow-lg'
              }`}>
                <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-cyan-300' : 'text-green-700'}`}>Access Your Vault</h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Once verified, your encrypted vault is unlocked on your device. Your passwords are decrypted only on your device, and you get instant access to all your saved passwords and accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Security Section */}
      <section id="security" className={`py-20 px-6 ${darkMode ? 'bg-gradient-to-b from-gray-900 to-gray-800' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-5xl md:text-6xl font-bold mb-4 ${darkMode ? '' : 'text-gray-900'}`}>
              Security You Can Trust
            </h2>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Built on proven cryptographic standards
            </p>
          </div>


          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Security Point 1 */}
            <div className={`rounded-xl p-8 transition ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-blue-300' : 'text-green-700'}`}>Proof-Based Authentication</h3>
              <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                We use Schnorr protocol, a mathematically proven authentication method. When you log in, we verify a proof that only someone with your password could generate.
              </p>
              <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-green-600'}`} /> Your password never transmitted</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-green-600'}`} /> Challenge-response verification</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-green-600'}`} /> Proven cryptographic security</li>
              </ul>
            </div>


            {/* Security Point 2 */}
            <div className={`rounded-xl p-8 transition ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-purple-300' : 'text-green-700'}`}>AES-256 Encryption</h3>
              <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Your vault is protected with AES-256-GCM, the same encryption standard used by governments and banks worldwide.
              </p>
              <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-green-600'}`} /> Military-grade encryption</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-green-600'}`} /> Local client-side encryption</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-green-600'}`} /> Authenticated encryption (GCM mode)</li>
              </ul>
            </div>


            {/* Security Point 3 */}
            <div className={`rounded-xl p-8 transition ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-pink-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-pink-300' : 'text-green-700'}`}>Client-Side Processing</h3>
              <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                All encryption, decryption, and proof generation happens on your device. We never see unencrypted data.
              </p>
              <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-pink-400' : 'text-green-600'}`} /> Zero server-side decryption</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-pink-400' : 'text-green-600'}`} /> Keys never leave your device</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-pink-400' : 'text-green-600'}`} /> Your data stays private</li>
              </ul>
            </div>


            {/* Security Point 4 */}
            <div className={`rounded-xl p-8 transition ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500 border-opacity-20 hover:border-opacity-50' 
                : 'bg-white border border-green-200 hover:shadow-lg'
            }`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-cyan-300' : 'text-green-700'}`}>Immutable Audit Logs</h3>
              <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Every login is recorded with a timestamp. These records are cryptographically protected to prevent tampering.
              </p>
              <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-green-600'}`} /> Complete access history</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-green-600'}`} /> Tamper-proof records</li>
                <li className="flex items-center gap-2"><CheckCircle className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-green-600'}`} /> Transparent accountability</li>
              </ul>
            </div>
          </div>


          
            
          
        </div>
      </section>


      


      {/* CTA Section */}
      <section className={`py-20 px-6 ${darkMode ? 'bg-gradient-to-b from-gray-800 to-gray-900' : 'bg-gradient-to-b from-white to-gray-50'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-5xl md:text-6xl font-bold mb-6 ${darkMode ? '' : 'text-gray-900'}`}>
            Ready to Reclaim Your Privacy?
          </h2>
          <p className={`text-xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Join users who are taking control of their digital security. Start protecting your passwords today—no credit card required.
          </p>


          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button onClick={() => {
                const token = localStorage.getItem('session_token');
                if (token) navigate('/dashboard'); else navigate('/login');
              }}
              className={`px-8 py-4 text-white rounded-lg transition text-lg font-semibold shadow-lg flex items-center justify-center gap-2 ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            }`}>
              Launch ZeroVault
              <ArrowRight className="w-5 h-5" />
            </button>
            
          </div>


          
        </div>
      </section>


      {/* Footer */}
      <footer className={`py-12 px-6 ${
        darkMode 
          ? 'bg-gray-900 border-t border-blue-500 border-opacity-20' 
          : 'bg-white border-t border-green-200'
      }`}>
        <div className="max-w-6xl mx-auto">
          

          <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              © 2025 ZeroVault. Built with security and privacy first. No passwords stored. Ever.
            </p>
        </div>
      </footer>


      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }


        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
