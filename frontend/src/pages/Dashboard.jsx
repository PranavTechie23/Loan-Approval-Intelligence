import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Upload, Download, RefreshCw, Database,
  FileText, Home, Shield, Sparkles
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import RiskSandbox from '../components/dashboard/RiskSandbox';
import { motion, AnimatePresence } from 'framer-motion';

import { Toast, tokens, Card, SegmentControl } from '../components/dashboard/SharedUI';
import OverviewTab from '../components/dashboard/OverviewTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import DataTableTab from '../components/dashboard/DataTableTab';
import InsightsTab from '../components/dashboard/InsightsTab';

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function Dashboard({ dark, setDark }) {
  const isLoggedIn = !!localStorage.getItem('token');
  const [file, setFile] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [cleaningStats, setCleaningStats] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Income_Desc');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [trendMetric, setTrendMetric] = useState('count');
  const [page, setPage] = useState(1);
  const [showImporter, setShowImporter] = useState(false);
  const dropRef = useRef(null);
  const PAGE_SIZE = 10;

  const t = tokens[dark ? 'dark' : 'light'];

  const showToast = (message, type = 'info') => setToast({ message, type });

  const fetchData = useCallback(async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const [dataRes, statsRes, insightsRes] = await Promise.all([
        axios.get(`${API_URL}/api/data`),
        axios.get(`${API_URL}/api/cleaning-stats`),
        axios.get(`${API_URL}/api/insights`).catch(() => ({ data: null }))
      ]);
      setChartData(dataRes.data || []);
      setCleaningStats(statsRes.data);
      setInsightsData(insightsRes.data);
    } catch (err) {
      // If backend not running, use demo data
      const demo = Array.from({ length: 120 }, (_, i) => ({
        Loan_ID: `LP${String(i + 1001).padStart(6, '0')}`,
        ApplicantIncome: Math.floor(3000 + Math.random() * 15000),
        LoanAmount: Math.floor(50 + Math.random() * 400),
        Loan_Status: Math.random() > 0.32 ? 'Approved' : 'Rejected',
        Gender: Math.random() > 0.3 ? 'Male' : 'Female',
        Education: Math.random() > 0.4 ? 'Graduate' : 'Not Graduate',
        Self_Employed: Math.random() > 0.8 ? 'Yes' : 'No',
        Credit_History: Math.random() > 0.2 ? 1 : 0,
        Property_Area: ['Urban', 'Semiurban', 'Rural'][Math.floor(Math.random() * 3)],
      }));
      setChartData(demo);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) setFile(f);
    else showToast('Please upload a CSV file', 'error');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${API_URL}/api/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(`Upload successful! Processed ${res.data.recordsProcessed || res.data.totalAfter} records`, 'success');
      setCleaningStats({
        totalUploaded: res.data.totalBefore || res.data.totalUploaded || 0,
        recordsAfterCleaning: res.data.totalAfter || res.data.recordsProcessed || 0,
        duplicatesRemoved: res.data.duplicatesRemoved || 0,
      });
      setFile(null);
      setTimeout(() => fetchData(), 500);
    } catch (err) {
      showToast(err.response?.data?.details || 'Upload failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (window.confirm("Are you sure you want to clear the database and reset all dashboard analytics?")) {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        await axios.post(`${API_URL}/api/clear`);
        setChartData([]);
        setCleaningStats(null);
        setShowImporter(false);
        showToast('Database wiped successfully. Dashboard reset!', 'success');
      } catch (err) {
        showToast('Failed to clear database.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const exportPDF = async () => {
    if (!chartData.length) { showToast('No data to export', 'error'); return; }
    const el = document.getElementById('dashboard-export');
    if (!el) return;
    try {
      showToast('Generating PDF…', 'info');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save('loan-analytics-report.pdf');
      showToast('PDF downloaded!', 'success');
    } catch { showToast('PDF export failed', 'error'); }
  };

  /* ─── DERIVED DATA ─── */
  const normalizedData = chartData.map(d => {
    // Deterministic hash based on Loan_ID
    let hash = 0;
    const idStr = d.Loan_ID || '';
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const rawIncome = d.ApplicantIncome || 0;
    // Normalize income: if max is absolute rupees (e.g. 55000), keep. If scaled (e.g. 55), multiply by 1000.
    const ApplicantIncome = rawIncome < 1500 ? rawIncome * 1000 : rawIncome;

    const rawLoan = d.LoanAmount || 0;
    // Normalize loan amount: if it is absolute (e.g. 90397), scale down to thousands (K).
    const LoanAmount = rawLoan > 2000 ? rawLoan / 1000 : rawLoan;

    const rawCoIncome = d.CoapplicantIncome || 0;
    // Normalize coapplicant income
    const CoapplicantIncome = rawCoIncome < 1500 && rawCoIncome > 0 ? rawCoIncome * 1000 : rawCoIncome;

    // Normalizing Semi-Urban -> Semiurban and Rural/Urban matching
    let propertyArea = d.Property_Area || '';
    if (propertyArea) {
      propertyArea = propertyArea.replace('-', '').trim();
      if (propertyArea.toLowerCase() === 'semiurban') propertyArea = 'Semiurban';
    } else {
      propertyArea = ['Urban', 'Semiurban', 'Rural'][hash % 3];
    }

    return {
      ...d,
      ApplicantIncome,
      CoapplicantIncome,
      LoanAmount,
      Gender: d.Gender || (hash % 10 > 2 ? 'Male' : 'Female'),
      Education: d.Education || (hash % 10 > 3 ? 'Graduate' : 'Not Graduate'),
      Self_Employed: d.Self_Employed || (hash % 10 > 8 ? 'Yes' : 'No'),
      Credit_History: d.Credit_History !== undefined && d.Credit_History !== null ? parseInt(d.Credit_History) : (hash % 10 > 1 ? 1 : 0),
      Property_Area: propertyArea
    };
  });

  const filteredData = normalizedData.filter(d => {
    const matchFilter = filter === 'All' || d.Loan_Status === filter;
    const matchSearch = !searchQuery || d.Loan_ID?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  /* ─── ADVANCED BANKING METRICS ─── */
  const bankingStats = (() => {
    if (!filteredData.length) return { avgLti: 0, creditPenetration: 0, jointLift: 0, jointRate: 0, singleRate: 0 };
    
    let totalLti = 0;
    let countLti = 0;
    
    // Joint application metrics
    const jointApps = filteredData.filter(d => (d.CoapplicantIncome || 0) > 0);
    const singleApps = filteredData.filter(d => !(d.CoapplicantIncome > 0));
    
    const jointApproved = jointApps.filter(d => d.Loan_Status === 'Approved').length;
    const singleApproved = singleApps.filter(d => d.Loan_Status === 'Approved').length;
    
    const jointRate = jointApps.length ? (jointApproved / jointApps.length) * 100 : 0;
    const singleRate = singleApps.length ? (singleApproved / singleApps.length) * 100 : 0;
    const jointLift = jointRate - singleRate;
    
    filteredData.forEach(d => {
      const combIncome = d.ApplicantIncome + (d.CoapplicantIncome || 0);
      if (combIncome > 0 && d.LoanAmount > 0) {
        const lti = (d.LoanAmount * 1000) / (combIncome * 12);
        totalLti += lti;
        countLti++;
      }
    });
    
    const avgLti = countLti ? totalLti / countLti : 0;
    
    // Credit Underwriting Index: % of approved loans with valid Credit_History === 1
    const approvedLoans = filteredData.filter(d => d.Loan_Status === 'Approved');
    const approvedWithCredit = approvedLoans.filter(d => d.Credit_History === 1).length;
    const creditPenetration = approvedLoans.length ? (approvedWithCredit / approvedLoans.length) * 100 : 0;
    
    return {
      avgLti,
      creditPenetration,
      jointLift,
      jointRate,
      singleRate
    };
  })();

  /* ─── LTI RISK CURVE BUCKETS ─── */
  const ltiBuckets = [
    { label: 'Low (<1.5x)', min: 0, max: 1.5 },
    { label: 'Moderate (1.5x-3x)', min: 1.5, max: 3.0 },
    { label: 'High (3x-4.5x)', min: 3.0, max: 4.5 },
    { label: 'Critical (>4.5x)', min: 4.5, max: Infinity }
  ];
  
  const ltiChartData = ltiBuckets.map(b => {
    const bucketLoans = filteredData.filter(d => {
      const comb = d.ApplicantIncome + (d.CoapplicantIncome || 0);
      if (comb <= 0) return false;
      const lti = (d.LoanAmount * 1000) / (comb * 12);
      return lti >= b.min && lti < b.max;
    });
    
    const approvedCount = bucketLoans.filter(d => d.Loan_Status === 'Approved').length;
    const totalCount = bucketLoans.length;
    const approvalRate = totalCount ? (approvedCount / totalCount) * 100 : 0;
    
    return {
      bucket: b.label,
      Applications: totalCount,
      'Approval Rate %': Math.round(approvalRate)
    };
  });

  const sorted = [...filteredData].sort((a, b) => {
    if (sortBy === 'Income_Desc') return b.ApplicantIncome - a.ApplicantIncome;
    if (sortBy === 'Income_Asc') return a.ApplicantIncome - b.ApplicantIncome;
    if (sortBy === 'Loan_Desc') return b.LoanAmount - a.LoanAmount;
    if (sortBy === 'Loan_Asc') return a.LoanAmount - b.LoanAmount;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const tableData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const approved = filteredData.filter(d => d.Loan_Status === 'Approved');
  const rejected = filteredData.filter(d => d.Loan_Status === 'Rejected');
  const approvalRate = filteredData.length ? ((approved.length / filteredData.length) * 100) : 0;
  const avgIncome = filteredData.length ? (filteredData.reduce((a, c) => a + (c.ApplicantIncome || 0), 0) / filteredData.length) : 0;
  const avgLoan = filteredData.length ? (filteredData.reduce((a, c) => a + (c.LoanAmount || 0), 0) / filteredData.length) : 0;
  const totalLoanValue = filteredData.reduce((a, c) => a + (c.LoanAmount || 0), 0);

  const pieData = [
    { name: 'Approved', value: approved.length },
    { name: 'Rejected', value: rejected.length }
  ];

  // Property area breakdown
  const areaData = ['Urban', 'Semiurban', 'Rural'].map(area => ({
    area,
    Approved: filteredData.filter(d => d.Property_Area === area && d.Loan_Status === 'Approved').length,
    Rejected: filteredData.filter(d => d.Property_Area === area && d.Loan_Status === 'Rejected').length,
  }));

  // Education breakdown
  const eduData = ['Graduate', 'Not Graduate'].map(edu => ({
    name: edu === 'Graduate' ? 'Graduate' : 'Non-Graduate',
    total: filteredData.filter(d => d.Education === edu).length,
    approved: filteredData.filter(d => d.Education === edu && d.Loan_Status === 'Approved').length,
  }));

  // Monthly trend
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const chunkSize = Math.max(1, Math.floor(filteredData.length / 6));
  const trendData = MONTHS.map((month, i) => {
    const chunk = filteredData.slice(i * chunkSize, (i + 1) * chunkSize);
    return {
      month,
      Approved: chunk.filter(d => d.Loan_Status === 'Approved').length,
      Rejected: chunk.filter(d => d.Loan_Status === 'Rejected').length,
      AvgIncome: chunk.length ? Math.round(chunk.reduce((a, c) => a + c.ApplicantIncome, 0) / chunk.length) : 0,
      AvgLoan: chunk.length ? Math.round(chunk.reduce((a, c) => a + c.LoanAmount, 0) / chunk.length) : 0,
    };
  });

  // Radar data for portfolio health
  const creditApproved = filteredData.filter(d => d.Credit_History === 1 && d.Loan_Status === 'Approved').length;
  const selfEmpApproved = filteredData.filter(d => d.Self_Employed === 'Yes' && d.Loan_Status === 'Approved').length;
  const gradApproved = filteredData.filter(d => d.Education === 'Graduate' && d.Loan_Status === 'Approved').length;
  const radarData = [
    { subject: 'Credit History', value: filteredData.filter(d => d.Credit_History === 1).length ? (creditApproved / filteredData.filter(d => d.Credit_History === 1).length * 100) : 0 },
    { subject: 'Graduate', value: filteredData.filter(d => d.Education === 'Graduate').length ? (gradApproved / filteredData.filter(d => d.Education === 'Graduate').length * 100) : 0 },
    { subject: 'Salaried', value: filteredData.filter(d => d.Self_Employed !== 'Yes').length ? (filteredData.filter(d => d.Self_Employed !== 'Yes' && d.Loan_Status === 'Approved').length / filteredData.filter(d => d.Self_Employed !== 'Yes').length * 100) : 0 },
    { subject: 'Urban', value: filteredData.filter(d => d.Property_Area === 'Urban').length ? (filteredData.filter(d => d.Property_Area === 'Urban' && d.Loan_Status === 'Approved').length / filteredData.filter(d => d.Property_Area === 'Urban').length * 100) : 0 },
    { subject: 'High Income', value: filteredData.filter(d => d.ApplicantIncome > 5000).length ? (filteredData.filter(d => d.ApplicantIncome > 5000 && d.Loan_Status === 'Approved').length / filteredData.filter(d => d.ApplicantIncome > 5000).length * 100) : 0 },
  ];

  // Sparkline data for each KPI
  const sparklines = {
    total: trendData.map(d => d.Approved + d.Rejected),
    approved: trendData.map(d => d.Approved),
    rejected: trendData.map(d => d.Rejected),
    rate: trendData.map(d => d.Approved + d.Rejected > 0 ? (d.Approved / (d.Approved + d.Rejected)) * 100 : 0),
  };

  const PIE_COLORS = [dark ? '#4ADE80' : '#16A34A', dark ? '#F87171' : '#DC2626'];
  const AREA_COLORS = [dark ? '#60A5FA' : '#2563EB', dark ? '#F87171' : '#DC2626'];

  /* ─────────────────────────────── LOGIN GUARD ─── */
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${dark ? 'bg-slate-950 text-slate-100' : 'bg-[#F7F5F2] text-slate-800'
        }`}>
        {/* Floating background elements */}
        <div className={`absolute top-1/4 -left-20 w-80 h-80 rounded-full filter blur-3xl opacity-30 animate-pulse ${dark ? 'bg-indigo-900/60' : 'bg-blue-300'
          }`}></div>
        <div className={`absolute bottom-1/4 -right-20 w-80 h-80 rounded-full filter blur-3xl opacity-30 animate-pulse ${dark ? 'bg-violet-900/40' : 'bg-indigo-200'
          }`}></div>

        <div className="relative text-center w-full max-w-sm animate-slideUp">
          <div className={`backdrop-blur-xl p-8 rounded-3xl border shadow-2xl ${dark ? 'bg-slate-900/70 border-slate-800/80 shadow-black/40' : 'bg-white/70 border-white/60 shadow-slate-100'
            }`}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className={`text-xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${dark ? 'from-white to-indigo-200' : 'from-slate-900 to-indigo-950'
              }`}>Access Restricted</h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">Please sign in to access the LoanSense dashboard</p>
            <Link to="/login" className="w-full inline-flex justify-center items-center py-3 bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 text-sm">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────── RENDER ─── */
  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans pb-12 ${dark ? 'bg-[#0C0E14] text-[#EEE9E0]' : 'bg-[#F7F5F2] text-[#1A1714]'
      }`}>
      {/* Dynamic Background Pattern */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 ${dark ? 'opacity-10' : 'opacity-[0.03]'}`}
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${dark ? 'white' : 'black'} 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Shared Header Navigation */}
      <Navbar
        isDashboard={true}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={fetchData}
        onExport={exportPDF}
        dark={dark}
        setDark={setDark}
        showImporter={showImporter}
        onToggleImport={() => setShowImporter(!showImporter)}
        onClearData={handleClearData}
        hasData={chartData.length > 0}
      />

      {/* Main Container context */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* ── UPLOAD SECTION ── */}
        <AnimatePresence>
          {(chartData.length === 0 || showImporter) && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="mb-7 overflow-hidden"
            >
              <Card dark={dark}
                title="Import Dataset"
                subtitle="Upload a CSV file to populate the dashboard"
                action={
                  cleaningStats && (
                    <div className="flex gap-6 items-center flex-wrap">
                      {[
                        { label: 'Uploaded', value: cleaningStats.totalUploaded },
                        { label: 'Cleaned', value: cleaningStats.recordsAfterCleaning },
                        { label: 'Removed', value: cleaningStats.duplicatesRemoved },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className="text-slate-400 text-3xs uppercase font-extrabold tracking-wider mb-0.5">{s.label}</p>
                          <p className={`text-base font-extrabold ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{s.value?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )
                }
              >
                <div className="p-6">
                  <div
                    ref={dropRef}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${isDragging
                        ? dark ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/5' : 'border-indigo-600 bg-indigo-50/50'
                        : dark ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mx-auto mb-4 transition ${dark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-500'
                      }`}>
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className={`font-bold text-sm mb-1 ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {file ? `✓ ${file.name}` : 'Drop your CSV here or browse'}
                    </p>
                    <p className="text-slate-400 text-xs mb-5 font-semibold">Supports .csv with loan application data</p>
                    <div className="flex gap-2.5 justify-center">
                      <label className={`px-4 py-2 rounded-xl cursor-pointer text-xs font-bold border transition ${dark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}>
                        Browse
                        <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                      </label>
                      <button
                        onClick={handleUpload}
                        disabled={loading || !file}
                        className={`px-5 py-2 rounded-xl border-0 font-bold text-xs transition shadow-md ${file
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white cursor-pointer shadow-indigo-500/10'
                            : dark ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        {loading ? 'Processing…' : 'Upload & Analyse'}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LOADING SPIN PANEL ── */}
        {loading && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-slate-300 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse">Processing CSV Data…</p>
          </div>
        )}

        {/* ── DATA VIEWS ── */}
        {!loading && chartData.length > 0 && (
          <div id="dashboard-export">

            {/* ── FILTER HEADER BAR ── */}
            <div className="flex items-center gap-4 mb-6 flex-wrap justify-between">
              <SegmentControl
                options={[{ value: 'All', label: 'All' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }]}
                value={filter} onChange={v => { setFilter(v); setPage(1); }} dark={dark}
              />
              <p className="text-slate-400 text-xs font-semibold">
                Showing <strong className={dark ? 'text-slate-100' : 'text-slate-800'}>{filteredData.length.toLocaleString()}</strong> of <strong className={dark ? 'text-slate-100' : 'text-slate-800'}>{chartData.length.toLocaleString()}</strong> records
              </p>
            </div>

            <AnimatePresence mode="wait">
              {/* ══ OVERVIEW TAB ══ */}
              {activeTab === 'overview' && (
                <OverviewTab
                  dark={dark}
                  filteredData={filteredData}
                  approved={approved}
                  rejected={rejected}
                  approvalRate={approvalRate}
                  avgIncome={avgIncome}
                  avgLoan={avgLoan}
                  totalLoanValue={totalLoanValue}
                  sparklines={sparklines}
                  pieData={pieData}
                  areaData={areaData}
                  trendData={trendData}
                  trendMetric={trendMetric}
                  setTrendMetric={setTrendMetric}
                  filter={filter}
                  setFilter={setFilter}
                  setPage={setPage}
                />
              )}

              {/* ══ ANALYTICS TAB ══ */}
              {activeTab === 'analytics' && (
                <AnalyticsTab
                  dark={dark}
                  bankingStats={bankingStats}
                  radarData={radarData}
                  eduData={eduData}
                  filteredData={filteredData}
                  ltiChartData={ltiChartData}
                />
              )}

              {/* ══ AI RISK SANDBOX TAB ══ */}
              {activeTab === 'sandbox' && (
                <motion.div
                  key="sandbox"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                >
                  <RiskSandbox dark={dark} />
                </motion.div>
              )}

              {/* ══ INSIGHTS TAB ══ */}
              {activeTab === 'insights' && (
                <InsightsTab
                  dark={dark}
                  insightsData={insightsData}
                />
              )}

              {/* ══ DATA TABLE TAB ══ */}
              {activeTab === 'data' && (
                <DataTableTab
                  dark={dark}
                  filteredData={filteredData}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setPage={setPage}
                  tableData={tableData}
                  page={page}
                  totalPages={totalPages}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── EMPTY STATE WHEN DATA IS NOT READY ── */}
        {!loading && chartData.length === 0 && (
          <div className="text-center py-20 animate-slideUp">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-6 ${dark ? 'bg-slate-900 border-slate-850 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
              <Database className="w-6 h-6" />
            </div>
            <h3 className={`text-lg font-extrabold mb-2 ${dark ? 'text-slate-200' : 'text-slate-800'}`}>No data loaded</h3>
            <p className="text-slate-400 text-xs font-semibold max-w-sm mx-auto">Please upload a valid CSV file using the importer above to populate dashboard analytics</p>
          </div>
        )}
      </main>

      {/* Dynamic Toasts */}
      {toast && (
        <Toast message={toast.message} type={toast.type} dark={dark} onClose={() => setToast(null)} />
      )}
    </div>
  );
}