import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

export default function Login({ dark, setDark }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('email', res.data.email);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      dark ? 'bg-slate-950 text-slate-100' : 'bg-[#F7F5F2] text-slate-800'
    }`}>
      {/* Shared Navbar at top */}
      <Navbar dark={dark} setDark={setDark} />

      {/* Main Centered Form Context */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        {/* Background blobs wrapper to prevent viewport overflow issues */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className={`absolute top-1/4 -left-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse ${
            dark ? 'bg-indigo-900/60' : 'bg-blue-300'
          }`}></div>
          <div className={`absolute bottom-1/4 -right-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse ${
            dark ? 'bg-violet-900/40' : 'bg-indigo-200'
          }`}></div>
          <div className={`absolute top-1/2 left-1/3 w-60 h-60 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse ${
            dark ? 'bg-indigo-950/80' : 'bg-purple-200'
          }`}></div>
        </div>

        <div className="relative w-full max-w-sm z-10 animate-slideUp">
          {/* Form Card Panel */}
          <div className={`backdrop-blur-xl p-6 sm:p-7 rounded-2xl shadow-2xl border transition-all duration-300 ${
            dark
              ? 'bg-slate-900/65 border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
              : 'bg-white/70 border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
          }`}>
            {/* Logo Header */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <LogIn className="w-5 h-5 text-white" />
              </div>
            </div>

            <h2 className={`text-xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r ${
              dark ? 'from-white via-indigo-100 to-indigo-300' : 'from-slate-900 via-blue-900 to-indigo-950'
            }`}>
              Welcome Back
            </h2>
            <p className={`text-center text-xs mt-1 mb-5 font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sign in to continue to your dashboard
            </p>

            {/* Error alerts with slide-down animations */}
            {error && (
              <div className={`flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs font-semibold border animate-shake ${
                dark
                  ? 'bg-red-950/35 text-red-300 border-red-900/50'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Email */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Email</label>
                <div className="relative group">
                  <Mail className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    dark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'
                  }`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl outline-none transition focus:ring-4 focus:ring-indigo-500/10 ${
                      dark
                        ? 'bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500'
                        : 'bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    } text-sm`}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline font-bold">
                    Forgot?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    dark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'
                  }`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-9 pr-9 py-2 border rounded-xl outline-none transition focus:ring-4 focus:ring-indigo-500/10 ${
                      dark
                        ? 'bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500'
                        : 'bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    } text-sm`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      dark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'
                    }`}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`w-4 h-4 rounded border transition ${
                    dark ? 'bg-slate-950/40 border-slate-800 text-indigo-600 focus:ring-indigo-500/20' : 'border-slate-300 text-indigo-600 focus:ring-indigo-500/20'
                  }`}
                />
                Remember me for 30 days
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-700 hover:opacity-95 text-white font-bold py-2 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${dark ? 'border-slate-800' : 'border-slate-200'}`}></div>
              </div>
              <div className="relative flex justify-center text-2xs font-extrabold uppercase tracking-widest">
                <span className={`px-3 ${
                  dark ? 'bg-slate-900/90 text-slate-500' : 'bg-white text-slate-400'
                }`}>Or continue with</span>
              </div>
            </div>

            {/* Social credentials login */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2 border rounded-xl transition font-bold text-xs ${
                  dark
                    ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                    : 'bg-white/80 border-slate-200 hover:bg-white text-slate-700 hover:text-slate-950'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2 border rounded-xl transition font-bold text-xs ${
                  dark
                    ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                    : 'bg-white/80 border-slate-200 hover:bg-white text-slate-700 hover:text-slate-950'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                GitHub
              </button>
            </div>

            {/* Footer switcher */}
            <p className={`mt-4 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-500 font-bold hover:text-indigo-600 hover:underline transition">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
