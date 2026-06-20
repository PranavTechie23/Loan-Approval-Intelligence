import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, RefreshCw, Download, Sun, Moon,
  Home, BarChart3, FileText, LogOut, Menu, X, User, Sparkles,
  Upload, Trash2, Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar({
  isDashboard = false,
  activeTab,
  setActiveTab,
  onRefresh,
  onExport,
  dark = true,
  setDark,
  showImporter,
  onToggleImport,
  onClearData,
  hasData = false,
}) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/login');
  };

  const username = email ? email.split('@')[0] : 'User';

  return (
    <nav className={`sticky top-0 z-50 w-full backdrop-blur-xl border-b transition-all duration-300 ${dark
        ? 'bg-slate-950/70 border-slate-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.3)] text-slate-100'
        : 'bg-white/70 border-slate-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-slate-800'
      } py-3 px-4 md:px-8`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 rounded-xl shadow-[0_8px_20px_rgba(79,70,229,0.3)]">
            <ShieldCheck className="w-5.5 h-5.5 text-white" />
          </div>
          <Link to="/" className={`text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${dark ? 'from-white via-indigo-100 to-indigo-300' : 'from-slate-900 via-blue-900 to-indigo-950'
            } hover:opacity-90 transition-opacity`}>
            LoanSense
          </Link>
        </div>

        {/* Dashboard Tabs - Desktop Only */}
        {isDashboard && token && (
          <div className={`hidden md:flex items-center gap-1.5 p-1 rounded-xl relative z-0 ${dark ? 'bg-slate-900/60 border border-slate-850/40' : 'bg-slate-100/85 border border-slate-200/40'
            }`}>
            {[
              { id: 'overview', label: 'Overview', Icon: Home },
              { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
              { id: 'data', label: 'Data Table', Icon: FileText },
              { id: 'sandbox', label: 'AI Risk Sandbox', Icon: Sparkles },
              { id: 'insights', label: 'AI Insights', Icon: Lightbulb },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 z-10 ${active
                      ? dark ? 'text-white' : 'text-indigo-700'
                      : dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {active && (
                    <motion.div
                      layoutId="navTabActive"
                      className={`absolute inset-0 -z-10 rounded-lg shadow-sm ${
                        dark 
                          ? 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/15' 
                          : 'bg-white shadow-indigo-100'
                      }`}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <tab.Icon className={`w-4 h-4 transition-transform ${active ? 'scale-105' : 'opacity-70'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Right Section Actions - Desktop Only */}
        <div className="hidden md:flex items-center gap-4">
          {isDashboard && token && (
            <>
              {hasData && onToggleImport && (
                <button
                  onClick={onToggleImport}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-200 ${showImporter
                      ? 'border-indigo-500 bg-indigo-600/10 text-indigo-500 font-extrabold'
                      : dark
                        ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-300'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 text-slate-700'
                    }`}
                  title="Toggle CSV Importer"
                >
                  <Upload className="w-4 h-4" />
                  {showImporter ? 'Hide Importer' : 'Import CSV'}
                </button>
              )}

              {hasData && onClearData && (
                <button
                  onClick={onClearData}
                  className={`p-2 rounded-xl border transition-all duration-200 ${dark
                      ? 'border-red-950 bg-red-950/20 hover:bg-red-900/40 hover:text-red-300 text-red-400'
                      : 'border-red-100 bg-red-50 hover:bg-red-100 hover:text-red-750 text-red-650'
                    }`}
                  title="Clear Uploaded Dataset"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              )}
            </>
          )}

          {/* Global Light/Dark Toggle */}
          {setDark && (
            <button
              onClick={() => setDark(!dark)}
              className={`p-2 rounded-xl border transition-all duration-200 ${dark
                  ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-amber-400 text-slate-400'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-amber-500 text-slate-600'
                }`}
              aria-label="Toggle Theme"
            >
              {dark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          )}

          {/* User Auth Info */}
          {token ? (
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${dark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {username[0].toUpperCase()}
                </div>
                <span className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Hi, {username}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${dark
                    ? 'border-red-950 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300'
                    : 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                  }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className={`text-sm font-semibold hover:underline ${dark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          {setDark && (
            <button
              onClick={() => setDark(!dark)}
              className={`p-2 rounded-lg border transition-all duration-200 ${dark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                }`}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg border transition-all duration-200 ${dark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className={`md:hidden mt-4 pt-4 border-t flex flex-col gap-4 animate-[slideUp_0.2s_ease-out] ${dark ? 'border-slate-800' : 'border-slate-200'
          }`}>
          {/* Dashboard Tabs for Mobile */}
          {isDashboard && token && (
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'overview', label: 'Overview', Icon: Home },
                { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
                { id: 'data', label: 'Data Table', Icon: FileText },
                { id: 'sandbox', label: 'AI Risk Sandbox', Icon: Sparkles },
                { id: 'insights', label: 'AI Insights', Icon: Lightbulb },
              ].map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${active
                        ? dark
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-700'
                        : dark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                      }`}
                  >
                    <tab.Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions for Mobile */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/40">
            {isDashboard && token && (
              <div className="flex flex-col gap-2">
                {onExport && (
                  <button
                    onClick={() => { onExport(); setMobileMenuOpen(false); }}
                    className={`w-full flex justify-center items-center gap-2 py-2.5 rounded-xl border text-xs font-bold ${dark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
                      }`}
                  >
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                )}

                {hasData && (
                  <div className="flex gap-2">
                    {onToggleImport && (
                      <button
                        onClick={() => { onToggleImport(); setMobileMenuOpen(false); }}
                        className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl border text-xs font-bold ${showImporter
                            ? 'border-indigo-500 bg-indigo-600/10 text-indigo-500'
                            : dark ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                      >
                        <Upload className="w-4 h-4" />
                        Importer
                      </button>
                    )}
                    {onClearData && (
                      <button
                        onClick={() => { onClearData(); setMobileMenuOpen(false); }}
                        className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl border text-xs font-bold ${dark ? 'border-red-950 bg-red-950/20 text-red-400' : 'border-red-100 bg-red-50 text-red-600'
                          }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Data
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {token ? (
              <div className="flex flex-col gap-2">
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${dark ? 'bg-slate-900/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                  <User className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold">Hi, {username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white font-bold text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-center py-2.5 rounded-xl border font-bold text-xs ${dark ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
