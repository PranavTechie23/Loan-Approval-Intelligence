import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, AlertTriangle, TrendingUp, CheckCircle, Target, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

export default function InsightsTab({ dark, insightsData }) {
  const [aiReport, setAiReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  if (!insightsData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className={`text-sm font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Generating AI Insights...
        </p>
      </div>
    );
  }

  const { marketComparison, highRiskProfiles, recommendedProfiles } = insightsData;

  return (
    <motion.div
      key="insights"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6"
    >
      {/* HEADER */}
      <div className={`p-6 rounded-2xl border ${dark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Lightbulb className="w-6 h-6 text-indigo-500" />
          </div>
          <h2 className={`text-xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
            AI Underwriting Insights
          </h2>
        </div>
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          Automated analysis detecting high-risk applications and highlighting optimal applicant benchmarks.
        </p>
        
        <div className="mt-6 flex flex-col gap-4">
          {!aiReport ? (
            <button
              onClick={async () => {
                setIsGenerating(true);
                try {
                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                  const token = localStorage.getItem('token');
                  const res = await axios.post(`${API_URL}/api/ai/generate-report`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  setAiReport(res.data.report);
                } catch (err) {
                  console.error(err);
                  setAiReport("Failed to generate report. Is the backend running?");
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${
                isGenerating 
                  ? 'bg-indigo-400 cursor-not-allowed text-white' 
                  : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-indigo-500/25 text-white hover:-translate-y-0.5'
              }`}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'Generating Exec Summary...' : 'Generate AI Executive Summary'}
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-6 rounded-xl border prose prose-sm max-w-none ${dark ? 'prose-invert bg-indigo-950/20 border-indigo-900/40 text-slate-300' : 'bg-indigo-50 border-indigo-100 text-slate-700'}`}
              >
                <ReactMarkdown>{aiReport}</ReactMarkdown>
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => setAiReport(null)}
                    className={`text-xs font-bold hover:underline ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}
                  >
                    Clear Report
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COL: High Risk & Recommendations */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          
          {/* HIGH RISK SECTION */}
          <div className={`p-6 rounded-2xl border ${dark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                High-Risk Applications Detected
              </h3>
            </div>
            
            {highRiskProfiles && highRiskProfiles.length > 0 ? (
              <div className="flex flex-col gap-4">
                {highRiskProfiles.map((profile, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${dark ? 'bg-slate-950/50 border-rose-900/30' : 'bg-rose-50/50 border-rose-100'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${dark ? 'text-rose-400' : 'text-rose-600'}`}>ID: {profile.Loan_ID}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${dark ? 'bg-rose-950 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>Requires Review</span>
                      </div>
                      <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Requested <strong>₹{profile.LoanAmount}k</strong> with <strong className="text-rose-500">0 Credit History</strong>.
                      </p>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg transition">
                      View Application <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>No high-risk profiles detected in current batch.</p>
            )}
          </div>

          {/* RECOMMENDATIONS SECTION */}
          <div className={`p-6 rounded-2xl border ${dark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                Optimal Benchmark Profiles
              </h3>
            </div>
            <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              These approved profiles have excellent credit and high income relative to average. Use these as benchmarks for border-line approvals.
            </p>
            
            {recommendedProfiles && recommendedProfiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedProfiles.map((profile, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex flex-col gap-2 ${dark ? 'bg-slate-950/50 border-emerald-900/30' : 'bg-emerald-50/30 border-emerald-100'}`}>
                    <span className={`text-xs font-bold ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>{profile.Loan_ID}</span>
                    <div className="flex justify-between items-center text-sm">
                      <span className={dark ? 'text-slate-400' : 'text-slate-600'}>Income:</span>
                      <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>₹{profile.ApplicantIncome.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={dark ? 'text-slate-400' : 'text-slate-600'}>Loan Amt:</span>
                      <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>₹{profile.LoanAmount}k</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={dark ? 'text-slate-400' : 'text-slate-600'}>Education:</span>
                      <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>{profile.Education}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>No optimal benchmarks found.</p>
            )}
          </div>

        </div>

        {/* RIGHT COL: Market Comparison */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className={`p-6 rounded-2xl border ${dark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                Portfolio Market Stats
              </h3>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className={`text-xs uppercase font-bold tracking-wider ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Global Approval Rate</span>
                <span className={`text-3xl font-black ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {marketComparison?.approvalRate?.toFixed(1) || 0}%
                </span>
                <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Based on total portfolio records</span>
              </div>
              
              <div className={`h-px w-full ${dark ? 'bg-slate-800' : 'bg-slate-200'}`} />

              <div className="flex flex-col gap-1">
                <span className={`text-xs uppercase font-bold tracking-wider ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Average Applicant Income</span>
                <span className={`text-2xl font-black ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                  ₹{Math.round(marketComparison?.avgIncome || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className={`text-xs uppercase font-bold tracking-wider ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Average Loan Amount</span>
                <span className={`text-2xl font-black ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                  ₹{Math.round(marketComparison?.avgLoan || 0).toLocaleString()}k
                </span>
              </div>
              
              <div className={`p-4 mt-2 rounded-xl border ${dark ? 'bg-indigo-950/20 border-indigo-900/30 text-indigo-200' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 mt-0.5 text-indigo-500" />
                  <p className="text-sm">
                    <strong>Action:</strong> Set automatic flagging rules for applicants requesting 
                    &gt; ₹{Math.round((marketComparison?.avgLoan || 0) * 1.5)}k with below-average income.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
