import React from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, ChartTooltip } from './SharedUI';

export default function AnalyticsTab({
  dark,
  bankingStats,
  radarData,
  eduData,
  filteredData,
  ltiChartData
}) {
  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      {/* Banking KPI metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
        {/* Card 1: Loan-to-Income */}
        <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
          dark ? 'border-slate-800 bg-slate-900/40 shadow-lg' : 'border-slate-200 bg-white/70 shadow-sm shadow-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider">Avg Loan-to-Income (LTI)</span>
            <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full border ${
              bankingStats.avgLti < 3.0
                ? dark ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : dark ? 'bg-amber-950/20 text-amber-400 border-amber-900/40' : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              {bankingStats.avgLti < 3.0 ? 'Optimal Risk' : 'Moderate Risk'}
            </span>
          </div>
          <div>
            <p className={`text-3.5xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              {bankingStats.avgLti.toFixed(2)}x
            </p>
            <p className="text-3xs text-slate-500 mt-1 font-semibold">
              Total active portfolio leverage multiple
            </p>
          </div>
        </div>

        {/* Card 2: Underwriting Index */}
        <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
          dark ? 'border-slate-800 bg-slate-900/40 shadow-lg' : 'border-slate-200 bg-white/70 shadow-sm shadow-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider">Credit Underwriting Index</span>
            <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full border ${
              bankingStats.creditPenetration > 85
                ? dark ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : dark ? 'bg-rose-950/20 text-rose-400 border-rose-900/40' : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              {bankingStats.creditPenetration > 85 ? 'High Quality' : 'Needs Review'}
            </span>
          </div>
          <div>
            <p className={`text-3.5xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              {bankingStats.creditPenetration.toFixed(1)}%
            </p>
            <p className="text-3xs text-slate-500 mt-1 font-semibold">
              Approved applications with credit history
            </p>
          </div>
        </div>

        {/* Card 3: Joint Lift */}
        <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
          dark ? 'border-slate-800 bg-slate-900/40 shadow-lg' : 'border-slate-200 bg-white/70 shadow-sm shadow-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider">Co-Signer Approval Lift</span>
            <span className="text-2xs font-extrabold px-2.5 py-0.5 rounded-full dark:bg-indigo-950/20 dark:text-indigo-400 dark:border dark:border-indigo-900/40 bg-indigo-50 text-indigo-700 border border-indigo-100">
              {bankingStats.jointLift >= 0 ? '+' : ''}{bankingStats.jointLift.toFixed(1)}% Lift
            </span>
          </div>
          <div>
            <p className={`text-3.5xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              {bankingStats.jointRate.toFixed(0)}% / {bankingStats.singleRate.toFixed(0)}%
            </p>
            <p className="text-3xs text-slate-500 mt-1 font-semibold">
              Joint vs Single applicant approval rate
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
        {/* Radar */}
        <Card dark={dark} title="Approval Rate by Segment" subtitle="Portfolio quality across dimensions">
          <div className="p-6 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <defs>
                  <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dark ? '#818CF8' : '#4F46E5'} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={dark ? '#C084FC' : '#818CF8'} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="radarStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dark ? '#818CF8' : '#4F46E5'} />
                    <stop offset="100%" stopColor={dark ? '#C084FC' : '#818CF8'} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={1} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: dark ? '#94A3B8' : '#64748B', fontWeight: 600, fontFamily: 'Outfit' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: dark ? '#5A6178' : '#94A3B8', fontFamily: 'Outfit' }} axisLine={false} />
                <Radar name="Approval %" dataKey="value" stroke="url(#radarStroke)" fill="url(#radarFill)" fillOpacity={0.7} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: dark ? '#131620' : '#FFFFFF' }} activeDot={{ r: 6, strokeWidth: 2, fill: dark ? '#D4A855' : '#C8923A' }} />
                <Tooltip content={<ChartTooltip dark={dark} />} formatter={v => `${v.toFixed(1)}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Education breakdown outcomes */}
        <Card dark={dark} title="Education vs Approval" subtitle="Graduate vs Non-Graduate outcomes">
          <div className="p-6 flex flex-col gap-6">
            {eduData.map(e => {
              const rate = e.total ? (e.approved / e.total) * 100 : 0;
              const isHigh = rate > 60;
              return (
                <div key={e.name} className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-bold text-xs uppercase tracking-wider ${dark ? 'text-slate-350' : 'text-slate-700'}`}>{e.name}</p>
                      <p className="text-3xs text-slate-550 font-semibold mt-0.5">{e.total} applicants · {e.approved} approved</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-md border ${
                        isHigh 
                          ? dark ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : dark ? 'bg-amber-950/20 text-amber-400 border-amber-900/40' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {rate.toFixed(0)}% Approval
                      </span>
                    </div>
                  </div>
                  <div className={`h-2.5 rounded-full overflow-hidden relative ${dark ? 'bg-slate-950/80 border border-slate-900/55' : 'bg-slate-105'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${rate}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r relative ${
                        isHigh
                          ? 'from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    </motion.div>
                  </div>
                </div>
              );
            })}

            <div className={`h-px ${dark ? 'bg-slate-800/80' : 'bg-slate-100'}`} />

            {/* Gender split details */}
            <div>
              <p className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider mb-3.5">Gender Distribution</p>
              {(() => {
                const maleCount = filteredData.filter(d => d.Gender === 'Male').length;
                const femaleCount = filteredData.filter(d => d.Gender === 'Female').length;
                const totalGender = maleCount + femaleCount || 1;
                const malePct = (maleCount / totalGender) * 100;
                const femalePct = (femaleCount / totalGender) * 100;
                
                return (
                  <div className="flex flex-col gap-4">
                    {/* Split bar comparison */}
                    <div className={`h-4.5 rounded-full overflow-hidden flex relative ${dark ? 'bg-slate-950/80 border border-slate-900/55' : 'bg-slate-105'}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${malePct}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-400 relative rounded-l-full"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${femalePct}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-rose-600 relative rounded-r-full"
                        style={{ width: `${femalePct}%`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
                      />
                    </div>

                    <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                      {/* Male Stats Card */}
                      <div className={`flex-1 rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between ${
                        dark 
                          ? 'bg-slate-950/40 border-slate-800/80 hover:border-blue-500/30' 
                          : 'bg-white border-slate-200/80 hover:border-blue-500/30 shadow-sm'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-3xs text-slate-500 font-extrabold uppercase tracking-wider">Male applicants</p>
                          </div>
                          <p className={`text-xl font-black mt-1 ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{maleCount.toLocaleString()}</p>
                        </div>
                        <p className="text-2.5xl font-black text-indigo-500/90">{malePct.toFixed(0)}%</p>
                      </div>

                      {/* Female Stats Card */}
                      <div className={`flex-1 rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between ${
                        dark 
                          ? 'bg-slate-950/40 border-slate-800/80 hover:border-pink-500/30' 
                          : 'bg-white border-slate-200/80 hover:border-pink-500/30 shadow-sm'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                            <p className="text-3xs text-slate-500 font-extrabold uppercase tracking-wider">Female applicants</p>
                          </div>
                          <p className={`text-xl font-black mt-1 ${dark ? 'text-slate-100' : 'text-slate-900'}`}>{femaleCount.toLocaleString()}</p>
                        </div>
                        <p className="text-2.5xl font-black text-pink-500/90">{femalePct.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </Card>
      </div>

      {/* Lending Risk & Income Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-7">
        {/* Lending Risk Curve composed card */}
        <Card dark={dark} title="Lending Risk Curve" subtitle="Portfolio distribution and approval rates by LTI risk band" className="lg:col-span-7">
          <div className="p-6">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={ltiChartData} barSize={28}>
                <defs>
                  <linearGradient id="ltiBarColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dark ? '#818CF8' : '#6366F1'} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={dark ? '#312E81' : '#4F46E5'} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                <XAxis dataKey="bucket" stroke={dark ? '#5A6178' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                {/* Primary Y Axis for volume */}
                <YAxis yAxisId="left" stroke={dark ? '#5A6178' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} label={{ value: 'Applications', angle: -90, position: 'insideLeft', style: { fill: dark ? '#8890A8' : '#6B6458', fontSize: 10, fontWeight: 700 } }} />
                {/* Secondary Y Axis for Approval rate line */}
                <YAxis yAxisId="right" orientation="right" stroke={dark ? '#5A6178' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} label={{ value: 'Approval Rate %', angle: 90, position: 'insideRight', style: { fill: dark ? '#8890A8' : '#6B6458', fontSize: 10, fontWeight: 700 } }} />
                
                <Tooltip content={<ChartTooltip dark={dark} />} />
                <Legend formatter={v => <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-655'}`}>{v}</span>} />
                <Bar yAxisId="left" dataKey="Applications" fill="url(#ltiBarColor)" radius={[5, 5, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="Approval Rate %" stroke={dark ? '#F59E0B' : '#D97706'} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: dark ? '#131620' : '#FFFFFF' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Income buckets bar rendering card */}
        <Card dark={dark} title="Income Distribution" subtitle="Applicant income segments and approval rates" className="lg:col-span-5">
          <div className="p-6">
            {(() => {
              const buckets = [
                { label: '<₹30K', min: 0, max: 30000 },
                { label: '₹30–60K', min: 30000, max: 60000 },
                { label: '₹60–90K', min: 60000, max: 90000 },
                { label: '₹90–120K', min: 90000, max: 120000 },
                { label: '>₹120K', min: 120000, max: Infinity },
              ];
              const bucketData = buckets.map(b => {
                const group = filteredData.filter(d => d.ApplicantIncome >= b.min && d.ApplicantIncome < b.max);
                return {
                  label: b.label,
                  Total: group.length,
                  Approved: group.filter(d => d.Loan_Status === 'Approved').length,
                  Rejected: group.filter(d => d.Loan_Status === 'Rejected').length,
                };
              });
              return (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={bucketData} barSize={18}>
                    <defs>
                      <linearGradient id="stackApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={dark ? '#34E0A1' : '#10B981'} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={dark ? '#059669' : '#064E3B'} stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id="stackRejected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={dark ? '#F87171' : '#EF4444'} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={dark ? '#B91C1C' : '#7F1D1D'} stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                    <XAxis dataKey="label" stroke={dark ? '#5A6178' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                    <YAxis stroke={dark ? '#5A6178' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip dark={dark} />} />
                    <Legend formatter={v => <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-655'}`}>{v}</span>} />
                    <Bar dataKey="Approved" fill="url(#stackApproved)" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Rejected" fill="url(#stackRejected)" stackId="a" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
