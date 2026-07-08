import React from 'react';
import { motion } from 'framer-motion';
import { Search, X, FileText } from 'lucide-react';
import { Card, Badge } from './SharedUI';

export default function DataTableTab({
  dark,
  filteredData,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  setPage,
  tableData,
  page,
  totalPages
}) {
  return (
    <motion.div
      key="data"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      <Card dark={dark} title="Loan Applications" subtitle={`${filteredData.length.toLocaleString()} records`}
        action={
          <div className="flex gap-2.5 items-center">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer outline-none focus:ring-4 focus:ring-indigo-500/10 ${dark
                ? 'bg-slate-900 border-slate-800 text-slate-300 focus:border-indigo-500'
                : 'bg-white border-slate-200 text-slate-600 focus:border-indigo-500'
              }`}>
              <option value="Income_Desc">↓ Income</option>
              <option value="Income_Asc">↑ Income</option>
              <option value="Loan_Desc">↓ Loan</option>
              <option value="Loan_Asc">↑ Loan</option>
            </select>
          </div>
        }>
        {/* Search query layout inside card */}
        <div className={`p-4 px-6 border-b flex items-center justify-between flex-wrap gap-4 ${dark ? 'border-slate-800/80' : 'border-slate-200/80'
          }`}>
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by Loan ID…"
              className={`w-full pl-9 pr-8 py-2 border rounded-xl outline-none transition text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 ${dark
                  ? 'bg-slate-950/40 border-slate-805 text-white placeholder-slate-600 focus:border-indigo-500'
                  : 'bg-white/80 border-slate-205 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-250">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table overflow container */}
        <div className={`overflow-x-auto rounded-2xl border ${dark ? 'border-slate-800/80 bg-slate-900/40 shadow-xl shadow-black/20' : 'border-slate-200 bg-white/70 shadow-lg shadow-slate-200/50'}`}>
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className={dark ? 'bg-slate-800/40 border-b border-slate-700/50' : 'bg-slate-50/80 border-b border-slate-200/80'}>
                {['Loan ID', 'Applicant Income', 'Loan Amount', 'Education', 'Area', 'Credit Score', 'Status'].map(h => (
                  <th key={h} className={`py-5 px-6 text-3xs font-black uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-500'
                    }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={dark ? 'divide-y divide-slate-800/50' : 'divide-y divide-slate-100/80'}>
              {tableData.map((app, i) => (
                <tr key={app.Loan_ID} className={`group transition-all duration-300 ${dark ? 'hover:bg-slate-800/40' : 'hover:bg-indigo-50/40'
                  }`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${dark ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300' : 'bg-indigo-100/50 text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-mono font-bold transition-colors ${dark ? 'text-slate-300 group-hover:text-indigo-400' : 'text-slate-700 group-hover:text-indigo-600'}`}>{app.Loan_ID}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className={`text-sm font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>₹{app.ApplicantIncome?.toLocaleString()}</span>
                      {app.CoapplicantIncome > 0 && <span className={`text-3xs font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>+ ₹{app.CoapplicantIncome?.toLocaleString()} (Co)</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${dark ? 'bg-slate-800/60 border-slate-700 text-slate-300 group-hover:border-indigo-500/30' : 'bg-slate-50 border-slate-200 text-slate-700 group-hover:border-indigo-200'}`}>
                      ₹{app.LoanAmount?.toLocaleString()}K
                    </div>
                  </td>
                  <td className={`py-4 px-6 text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {app.Education === 'Graduate' ? (
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" /> Graduate</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" /> Not Graduate</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      app.Property_Area === 'Urban' 
                        ? dark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-700'
                        : app.Property_Area === 'Semiurban'
                          ? dark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
                          : dark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {app.Property_Area || '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {app.Credit_History === 1 ? (
                      <div className={`flex items-center gap-2 text-xs font-bold ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${dark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>✓</div>
                        Good
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 text-xs font-bold ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${dark ? 'bg-rose-500/20' : 'bg-rose-100'}`}>✗</div>
                        Poor
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6"><Badge status={app.Loan_Status} dark={dark} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination indicators footer */}
        <div className={`p-4 px-6 border-t flex items-center justify-between flex-wrap gap-4 text-xs font-semibold ${dark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
          <p>
            Page {page} of {totalPages} · {tableData.length} records shown
          </p>
          <div className="flex gap-2.5">
            {[
              { label: '← Prev', action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
              { label: 'Next →', action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action} disabled={btn.disabled} className={`px-4 py-2 rounded-xl border font-bold text-2xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${dark
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
