import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Activity, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
export const tokens = {
  light: {
    bg: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EDE8',
    border: '#E8E2D9',
    borderStrong: '#CFC9BE',
    text: '#1A1714',
    textSub: '#6B6458',
    textMuted: '#9C9489',
    accent: '#C8923A',
    accentSoft: '#F5EBD9',
    blue: '#2563EB',
    blueSoft: '#DBEAFE',
    green: '#15803D',
    greenSoft: '#DCFCE7',
    red: '#B91C1C',
    redSoft: '#FEE2E2',
    amber: '#B45309',
    amberSoft: '#FEF3C7',
  },
  dark: {
    bg: '#0C0E14',
    surface: '#131620',
    surfaceAlt: '#1A1E2C',
    border: '#252A3A',
    borderStrong: '#323848',
    text: '#EEE9E0',
    textSub: '#8890A8',
    textMuted: '#5A6178',
    accent: '#D4A855',
    accentSoft: '#2A2010',
    blue: '#60A5FA',
    blueSoft: '#1E3A6E',
    green: '#4ADE80',
    greenSoft: '#0D2E1A',
    red: '#F87171',
    redSoft: '#2E1010',
    amber: '#FCD34D',
    amberSoft: '#2E2008',
  }
};

/* ─────────────────────────────────────────────
   ANIMATED COUNTER HOOK
───────────────────────────────────────────── */
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

/* ─────────────────────────────────────────────
   CUSTOM TOOLTIP
───────────────────────────────────────────── */
export const ChartTooltip = ({ active, payload, label, dark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`backdrop-blur-md p-3.5 border rounded-xl shadow-xl transition ${dark ? 'bg-slate-950/90 border-slate-800 text-slate-250' : 'bg-white/95 border-slate-200 text-slate-800'
      }`}>
      {label && <p className="text-3xs text-slate-400 font-extrabold uppercase tracking-wider mb-2">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-2xs text-slate-400">{p.name}:</span>
          <span className={`text-2xs font-extrabold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
            {typeof p.value === 'number' ? (p.name?.includes('Income') || p.name?.includes('Loan') ? `₹${p.value.toLocaleString()}` : p.value.toLocaleString()) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   KPI CARD WITH ANIMATED COUNTER & FRAMER-MOTION
───────────────────────────────────────────── */
export const KpiCard = ({ label, value, rawValue, icon: Icon, change, color, dark, prefix = '', suffix = '', onClick, active }) => {
  const animated = useCountUp(typeof rawValue === 'number' ? rawValue : 0);
  const displayVal = typeof rawValue === 'number' ? `${prefix}${animated.toLocaleString()}${suffix}` : value;

  const colorMap = {
    blue: { from: 'from-blue-600', to: 'to-indigo-600', glow: 'rgba(59,130,246,0.15)', borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20' },
    green: { from: 'from-emerald-500', to: 'to-teal-600', glow: 'rgba(16,185,129,0.15)', borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20' },
    red: { from: 'from-rose-500', to: 'to-red-600', glow: 'rgba(244,63,94,0.15)', borderActive: 'border-rose-500 ring-2 ring-rose-500/20' },
    amber: { from: 'from-amber-500', to: 'to-orange-600', glow: 'rgba(245,158,11,0.15)', borderActive: 'border-amber-500 ring-2 ring-amber-500/20' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`relative rounded-2xl border p-5 overflow-hidden transition-all duration-300 cursor-pointer ${active
          ? dark ? `${c.borderActive} bg-slate-900/80 shadow-lg shadow-black/20` : `${c.borderActive} bg-white shadow-md shadow-indigo-500/5`
          : dark
            ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700 shadow-lg shadow-black/10'
            : 'border-slate-200/80 bg-white/70 hover:border-slate-350 shadow-sm shadow-slate-100'
        }`}
    >
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full filter blur-3xl pointer-events-none opacity-80"
        style={{ background: c.glow }}
      />
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.from} ${c.to} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-2xs font-extrabold px-2.5 py-1 rounded-full ${change >= 0
              ? dark ? 'bg-emerald-950/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              : dark ? 'bg-rose-950/30 text-rose-400' : 'bg-rose-50 text-rose-700'
            }`}>
            {change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <p className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider mb-1.5">{label}</p>
      <p className={`text-2.5xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
        {displayVal}
      </p>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   SECTION CARD
───────────────────────────────────────────── */
export const Card = ({ children, style = {}, className = '', dark, title, subtitle, action }) => {
  return (
    <div className={`premium-card rounded-2xl border transition-all duration-300 overflow-hidden ${dark ? 'border-slate-800/60 bg-slate-900/50 backdrop-blur-md shadow-lg shadow-black/10' : 'border-slate-200/60 bg-white/70 backdrop-blur-md shadow-sm shadow-slate-100'
      } ${className}`} style={style}>
      {(title || action) && (
        <div className={`px-6 py-4 border-b flex items-center justify-between flex-wrap gap-4 ${dark ? 'border-slate-800/60' : 'border-slate-200/60'
          }`}>
          <div>
            <h4 className={`font-extrabold text-sm tracking-tight ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h4>
            {subtitle && <p className="text-slate-400 text-3xs font-semibold mt-1.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────
   BADGE
───────────────────────────────────────────── */
export const Badge = ({ status, dark }) => {
  const approved = status === 'Approved';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-3xs font-extrabold tracking-wider uppercase border transition-colors ${approved
        ? dark
          ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50'
          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : dark
          ? 'bg-rose-950/20 text-rose-400 border-rose-900/50'
          : 'bg-rose-50 text-rose-700 border-rose-100'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${approved ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────
   MINI SPARKLINE (SVG)
───────────────────────────────────────────── */
export const Sparkline = ({ data, color, width = 80, height = 32 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─────────────────────────────────────────────
   RISK METER
───────────────────────────────────────────── */
export const RiskMeter = ({ pct, dark }) => {
  const color = pct < 30 ? 'text-emerald-500' : pct < 60 ? 'text-amber-500' : 'text-rose-500';
  const label = pct < 30 ? 'Low Risk' : pct < 60 ? 'Medium Risk' : 'High Risk';
  const barColor = pct < 30 ? 'from-emerald-500 to-teal-500' : pct < 60 ? 'from-amber-500 to-orange-500' : 'from-rose-500 to-red-500';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-3xs">Portfolio Risk</span>
        <span className={`${color} font-extrabold uppercase text-3xs tracking-wider`}>{label}</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
        />
      </div>
      <div className="flex justify-between items-center text-2xs text-slate-500 font-semibold px-0.5">
        <span>rejection rate</span>
        <span className={dark ? 'text-slate-300' : 'text-slate-700'}>{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   SEGMENTED CONTROL
───────────────────────────────────────────── */
export const SegmentControl = ({ options, value, onChange, dark }) => {
  return (
    <div className={`inline-flex rounded-xl p-1 gap-1 transition-all ${dark ? 'bg-slate-950/80 border border-slate-800/40' : 'bg-slate-105'
      }`}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3.5 py-1.5 rounded-lg border-0 cursor-pointer text-xs font-bold transition-all duration-200 ${active
                ? dark
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-800 shadow-sm'
                : dark
                  ? 'bg-transparent text-slate-400 hover:text-slate-200'
                  : 'bg-transparent text-slate-500 hover:text-slate-850'
              }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   NOTIFICATION TOAST
───────────────────────────────────────────── */
export const Toast = ({ message, type, onClose, dark }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: dark ? 'bg-emerald-950/30' : 'bg-emerald-50', border: 'border-emerald-500/40', text: dark ? 'text-emerald-400' : 'text-emerald-700', Icon: CheckCircle },
    error: { bg: dark ? 'bg-rose-950/30' : 'bg-rose-50', border: 'border-rose-500/40', text: dark ? 'text-rose-400' : 'text-rose-700', Icon: AlertCircle },
    info: { bg: dark ? 'bg-blue-950/30' : 'bg-blue-50', border: 'border-blue-500/40', text: dark ? 'text-blue-400' : 'text-blue-700', Icon: Activity },
  };
  const c = colors[type] || colors.info;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 border rounded-2xl p-4 shadow-2xl max-w-sm min-w-[280px] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${dark ? 'bg-slate-900 border-slate-850 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-300/30'} ${c.bg} ${c.border}`}>
      <c.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.text}`} />
      <p className={`text-xs font-semibold leading-relaxed flex-1 ${dark ? 'text-slate-250' : 'text-slate-700'}`}>{message}</p>
      <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-200 p-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
