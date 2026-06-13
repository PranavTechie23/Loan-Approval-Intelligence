import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

export default function Register({ dark, setDark }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  // Password strength evaluation
  const passwordStrength = useMemo(() => {
    const { password } = formData;
    if (!password) return { score: 0, label: '', color: '', textColor: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-500' },
      { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-500' },
      { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
      { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500' },
      { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-500' },
    ];
    return { score, ...levels[Math.min(score - 1, 4)] || levels[0] };
  }, [formData.password]);

  // Validation
  const validation = useMemo(() => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (touched.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (touched.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (touched.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  }, [formData, touched]);

  const isFormValid =
    formData.email &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword &&
    Object.keys(validation).length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });

    if (!isFormValid) return;

    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${API_URL}/auth/register`, {
        email: formData.email,
        password: formData.password,
      });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      dark ? 'bg-slate-950 text-slate-100' : 'bg-[#F7F5F2] text-slate-800'
    }`}>
      {/* Top Navbar */}
      <Navbar dark={dark} setDark={setDark} />

      {/* Main Centered container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        {/* Background blobs wrapper to prevent viewport overflow issues */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className={`absolute top-1/4 -left-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse ${
            dark ? 'bg-indigo-900/60' : 'bg-blue-300'
          }`}></div>
          <div className={`absolute bottom-1/4 -right-20 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse ${
            dark ? 'bg-violet-900/40' : 'bg-indigo-200'
          }`}></div>
        </div>

        <div className="relative w-full max-w-sm z-10 animate-slideUp">
          {/* Card Panel */}
          <div className={`backdrop-blur-xl p-6 sm:p-7 rounded-2xl shadow-2xl border transition-all duration-300 ${
            dark
              ? 'bg-slate-900/65 border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
              : 'bg-white/70 border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
          }`}>
            {/* Header Icon */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 shadow-lg shadow-indigo-500/25">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className={`text-xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r mt-3 ${
                dark ? 'from-white via-indigo-100 to-indigo-300' : 'from-slate-900 via-blue-900 to-indigo-950'
              }`}>
                Create an Account
              </h2>
              <p className={`text-xs mt-1 font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sign up to get started with LoanSense
              </p>
            </div>

            {/* Error alerts with slide animation */}
            {error && (
              <div
                role="alert"
                className={`flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs font-semibold border animate-shake ${
                  dark
                    ? 'bg-red-950/35 text-red-300 border-red-900/50'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div
                role="status"
                className={`flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs font-semibold border ${
                  dark
                    ? 'bg-green-950/35 text-green-300 border-green-900/50'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-3.5" noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    dark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-gray-400 group-focus-within:text-indigo-600'
                  }`} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!validation.email}
                    aria-describedby={validation.email ? 'email-error' : undefined}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 outline-none transition focus:ring-4 focus:ring-indigo-500/10 text-sm ${
                      validation.email
                        ? 'border-red-500/50 focus:border-red-500'
                        : dark
                          ? 'bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500'
                          : 'bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    }`}
                    placeholder="name@example.com"
                  />
                </div>
                {validation.email && (
                  <p id="email-error" className="mt-1 text-2xs font-semibold text-red-500 px-1">
                    {validation.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Password
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    dark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-gray-400 group-focus-within:text-indigo-600'
                  }`} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!validation.password}
                    aria-describedby="password-strength password-error"
                    className={`w-full border rounded-xl pl-9 pr-9 py-2 outline-none transition focus:ring-4 focus:ring-indigo-500/10 text-sm ${
                      validation.password
                        ? 'border-red-500/50 focus:border-red-500'
                        : dark
                          ? 'bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500'
                          : 'bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      dark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength visual progress indicator */}
                {formData.password && (
                  <div id="password-strength" className="mt-2 px-1">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= passwordStrength.score ? passwordStrength.color : dark ? 'bg-slate-800' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-2xs font-extrabold mt-1 ${passwordStrength.textColor}`}>
                      Strength: {passwordStrength.label}
                    </p>
                  </div>
                )}
                {validation.password && (
                  <p id="password-error" className="mt-1 text-2xs font-semibold text-red-500 px-1">
                    {validation.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}
                >
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    dark ? 'text-slate-500 group-focus-within:text-indigo-400' : 'text-gray-400 group-focus-within:text-indigo-600'
                  }`} />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!validation.confirmPassword}
                    className={`w-full border rounded-xl pl-9 pr-9 py-2 outline-none transition focus:ring-4 focus:ring-indigo-500/10 text-sm ${
                      validation.confirmPassword
                        ? 'border-red-500/50 focus:border-red-500'
                        : dark
                          ? 'bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500'
                          : 'bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      dark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'
                    }`}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {validation.confirmPassword && (
                  <p className="mt-1 text-2xs font-semibold text-red-500 px-1">{validation.confirmPassword}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !!success || !isFormValid}
                className="w-full bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-700 hover:opacity-95 text-white font-bold py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-[0_8px_30px_rgba(79,70,229,0.3)] text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Footer switch page */}
            <p className={`mt-4 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-indigo-500 font-bold hover:text-indigo-600 hover:underline transition"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Terms info */}
          <p className={`text-center text-2xs mt-3.5 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
            By signing up, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-indigo-500">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-indigo-500">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}