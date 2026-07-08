import React from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Users, CheckCircle, XCircle, Target } from 'lucide-react';
import { KpiCard, Sparkline, Card, RiskMeter, ChartTooltip, SegmentControl } from './SharedUI';

export default function OverviewTab({
  dark,
  filteredData,
  approved,
  rejected,
  approvalRate,
  avgIncome,
  avgLoan,
  totalLoanValue,
  sparklines,
  pieData,
  areaData,
  trendData,
  trendMetric,
  setTrendMetric,
  filter,
  setFilter,
  setPage
}) {
  const PIE_COLORS = [dark ? '#4ADE80' : '#16A34A', dark ? '#F87171' : '#DC2626'];
  const AREA_COLORS = [dark ? '#60A5FA' : '#2563EB', dark ? '#F87171' : '#DC2626'];

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      {/* KPI metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        <KpiCard icon={Users} label="Total Applications" rawValue={filteredData.length} change={12} color="blue" dark={dark}
          onClick={() => { setFilter('All'); setPage(1); }} active={filter === 'All'} />
        <KpiCard icon={CheckCircle} label="Approved" rawValue={approved.length} change={8} color="green" dark={dark}
          onClick={() => { setFilter('Approved'); setPage(1); }} active={filter === 'Approved'} />
        <KpiCard icon={XCircle} label="Rejected" rawValue={rejected.length} change={-3} color="red" dark={dark}
          onClick={() => { setFilter('Rejected'); setPage(1); }} active={filter === 'Rejected'} />
        <KpiCard icon={Target} label="Approval Rate" rawValue={Math.round(approvalRate)} suffix="%" color="amber" dark={dark}
          onClick={() => { setFilter('All'); setPage(1); }} active={false} />
      </div>

      {/* Secondary sparkline metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
        {[
          { label: 'Avg Applicant Income', value: `₹${Math.round(avgIncome).toLocaleString()}`, sub: 'Per application', sparkKey: 'approved', color: AREA_COLORS[0] },
          { label: 'Avg Loan Amount', value: `₹${Math.round(avgLoan).toLocaleString()}K`, sub: 'Thousand rupees', sparkKey: 'rejected', color: AREA_COLORS[1] },
          { label: 'Total Loan Portfolio', value: `₹${(totalLoanValue / 100).toFixed(1)}L`, sub: 'Lakh rupees', sparkKey: 'total', color: dark ? '#FCD34D' : '#D97706' },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all duration-300 ${dark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white/70 shadow-sm'
            }`}>
            <div>
              <p className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider mb-1">{item.label}</p>
              <p className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-slate-850'}`}>{item.value}</p>
              <p className="text-3xs text-slate-500 mt-1 font-semibold">{item.sub}</p>
            </div>
            <Sparkline data={sparklines[item.sparkKey]} color={item.color} />
          </div>
        ))}
      </div>

      {/* Charts row section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-7">
        {/* Portfolio risk (col-span-3) */}
        <Card dark={dark} title="Portfolio Health" subtitle="Risk & quality indicators" className="lg:col-span-3">
          <div className="p-6 flex flex-col gap-6">
            <RiskMeter pct={100 - approvalRate} dark={dark} />
            <div className={`h-px ${dark ? 'bg-slate-800/80' : 'bg-slate-100'}`} />
            <div className="flex flex-col gap-4">
              {[
                { label: 'Credit History OK', value: `${filteredData.filter(d => d.Credit_History === 1).length}`, sub: 'applicants' },
                { label: 'Self-Employed', value: `${filteredData.filter(d => d.Self_Employed === 'Yes').length}`, sub: 'applicants' },
                { label: 'Graduates', value: `${filteredData.filter(d => d.Education === 'Graduate').length}`, sub: 'applicants' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-xs">
                  <p className="text-slate-400 font-semibold">{row.label}</p>
                  <p className={`font-bold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{row.value} <span className="text-slate-500 font-normal">{row.sub}</span></p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Donut (col-span-4) */}
        <Card dark={dark} title="Approval Distribution" subtitle="By loan status" className="lg:col-span-4">
          <div className="p-6">
            <ResponsiveContainer width="100%" height={195}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={76} paddingAngle={4} dataKey="value"
                  startAngle={90} endAngle={-270}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip dark={dark} />} />
                <Legend formatter={v => <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-650'}`}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 flex-wrap">
              {pieData.map((d, i) => (
                <div key={d.name} className="text-center">
                  <p style={{ color: PIE_COLORS[i] }} className="font-extrabold text-base">{d.value}</p>
                  <p className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider">{d.name}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Region bar (col-span-5) */}
        <Card dark={dark} title="Applications by Region" subtitle="Urban · Semiurban · Rural" className="lg:col-span-5">
          <div className="p-6">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={areaData} barSize={16}>
                <defs>
                  <linearGradient id="barApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dark ? '#4ADE80' : '#16A34A'} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={dark ? '#10B981' : '#059669'} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dark ? '#F87171' : '#DC2626'} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={dark ? '#EF4444' : '#B91C1C'} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="area" stroke={dark ? '#64748B' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis stroke={dark ? '#64748B' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip content={<ChartTooltip dark={dark} />} />
                <Legend formatter={v => <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-650'}`}>{v}</span>} />
                <Bar dataKey="Approved" fill="url(#barApproved)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill="url(#barRejected)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Trend chart analysis */}
      <Card dark={dark} className="mb-6"
        title="Trend Analysis"
        subtitle="Six-month rolling view"
        action={
          <SegmentControl
            options={[{ value: 'count', label: 'Count' }, { value: 'income', label: 'Income' }, { value: 'loan', label: 'Loan Amt' }]}
            value={trendMetric} onChange={setTrendMetric} dark={dark}
          />
        }>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={260}>
            {trendMetric === 'count' ? (
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS[0]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={AREA_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS[1]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={AREA_COLORS[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" stroke={dark ? '#64748B' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis stroke={dark ? '#64748B' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip content={<ChartTooltip dark={dark} />} />
                <Legend formatter={v => <span className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-655'}`}>{v}</span>} />
                <Area type="monotone" dataKey="Approved" stroke={AREA_COLORS[0]} fill="url(#gApproved)" strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="Rejected" stroke={AREA_COLORS[1]} fill="url(#gRejected)" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            ) : (
              <BarChart data={trendData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" stroke={dark ? '#64748B' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis stroke={dark ? '#64748B' : '#94A3B8'} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip content={<ChartTooltip dark={dark} />} />
                <Bar dataKey={trendMetric === 'income' ? 'AvgIncome' : 'AvgLoan'}
                  fill={dark ? '#818CF8' : '#6366F1'} radius={[4, 4, 0, 0]}
                  name={trendMetric === 'income' ? 'Avg Income' : 'Avg Loan'} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}
