import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShieldCheck, ShieldAlert, ArrowUpRight,
  ArrowDownRight, HelpCircle, UserCheck, RefreshCw,
  DollarSign, Landmark, Percent, Calendar
} from 'lucide-react';

// Persona presets for quick sandbox testing
const PERSONAS = [
  {
    name: 'Prime Borrower',
    icon: '🌟',
    description: 'High income, low debt, clean credit history',
    data: {
      monthly_income: 120000,
      income_stability: 95,
      total_emi: 15000,
      credit_limit: 450000,
      outstanding_balance: 35000,
      past_delinquencies: 0,
      months_since_last_dq: 60,
      loan_amount_requested: 200000,
      loan_tenure: 36,
      upi_volume: 45000,
      ecommerce_spend: 12000,
      utility_score: 92
    }
  },
  {
    name: 'Young Professional',
    icon: '🎓',
    description: 'Moderate income, no defaults, active transaction history',
    data: {
      monthly_income: 60000,
      income_stability: 80,
      total_emi: 8000,
      credit_limit: 150000,
      outstanding_balance: 20000,
      past_delinquencies: 0,
      months_since_last_dq: 60,
      loan_amount_requested: 80000,
      loan_tenure: 24,
      upi_volume: 25000,
      ecommerce_spend: 6000,
      utility_score: 85
    }
  },
  {
    name: 'High Debt Risk',
    icon: '⚠️',
    description: 'High EMI obligations, near credit limit, high utilization',
    data: {
      monthly_income: 75000,
      income_stability: 70,
      total_emi: 45000,
      credit_limit: 200000,
      outstanding_balance: 185000,
      past_delinquencies: 0,
      months_since_last_dq: 60,
      loan_amount_requested: 250000,
      loan_tenure: 60,
      upi_volume: 12000,
      ecommerce_spend: 18000,
      utility_score: 72
    }
  },
  {
    name: 'Subprime / Default Risk',
    icon: '🛑',
    description: 'Recent credit delinquencies, low utility scores',
    data: {
      monthly_income: 45000,
      income_stability: 55,
      total_emi: 22000,
      credit_limit: 100000,
      outstanding_balance: 90000,
      past_delinquencies: 2,
      months_since_last_dq: 6,
      loan_amount_requested: 150000,
      loan_tenure: 48,
      upi_volume: 8000,
      ecommerce_spend: 2500,
      utility_score: 48
    }
  }
];

export default function RiskSandbox({ dark }) {
  const [formData, setFormData] = useState(PERSONAS[0].data);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeGroup, setActiveGroup] = useState('financial');

  // Local fallback calculation for credit risk (SHAP-inspired heuristic)
  const calculateOfflinePrediction = (data) => {
    let baseLogit = -1.2; // approx 23% default rate

    // DTI ratio (Debt-to-Income)
    const dti = data.total_emi / data.monthly_income;
    const dtiImpact = dti > 0.4 ? (dti - 0.4) * 6.0 : (dti - 0.4) * 2.5;
    baseLogit += dtiImpact;

    // LTI ratio (Loan-to-Income)
    const lti = data.loan_amount_requested / (data.monthly_income * 12);
    const ltiImpact = lti > 0.35 ? (lti - 0.35) * 4.5 : (lti - 0.35) * 1.5;
    baseLogit += ltiImpact;

    // Credit Utilization
    const util = data.outstanding_balance / data.credit_limit;
    const utilImpact = util > 0.5 ? (util - 0.5) * 5.0 : (util - 0.5) * 2.0;
    baseLogit += utilImpact;

    // Delinquency recency and volume
    let dqImpact = 0;
    if (data.past_delinquencies > 0) {
      dqImpact += data.past_delinquencies * 1.4;
      const recencyPercent = Math.max(0, (60 - data.months_since_last_dq) / 60);
      dqImpact += recencyPercent * 1.8;
    } else {
      dqImpact -= 0.8;
    }
    baseLogit += dqImpact;

    // Alternative Score (Utility Score + Stability)
    const utilityImpact = ((75 - data.utility_score) / 100) * 2.2;
    const stabilityImpact = ((80 - data.income_stability) / 100) * 1.5;
    baseLogit += utilityImpact + stabilityImpact;

    // Transact activity (UPI and e-commerce vs income)
    const transactionCapacity = (data.upi_volume + data.ecommerce_spend) / data.monthly_income;
    if (transactionCapacity > 0.6) baseLogit -= 0.6;
    else if (transactionCapacity < 0.2) baseLogit += 0.4;

    // Sigmoid mapping
    const pd = 1 / (1 + Math.exp(-baseLogit));
    const finalPd = Math.min(Math.max(pd, 0.02), 0.98); // Clamp between 2% and 98%

    // Categorize Decision
    let decision = 'Approved';
    let riskBand = 'Low';
    if (finalPd >= 0.45) {
      decision = 'Rejected';
      riskBand = 'High';
    } else if (finalPd >= 0.22) {
      decision = 'Review Required';
      riskBand = 'Medium';
    }

    // Generate simulated SHAP explanations
    const factors = [
      { name: 'Debt-to-Income Ratio (DTI)', impact: dtiImpact, value: dti },
      { name: 'Loan-to-Annual-Income (LTI)', impact: ltiImpact, value: lti },
      { name: 'Credit Utilization Ratio', impact: utilImpact, value: util },
      { name: 'Past Delinquencies History', impact: dqImpact, value: data.past_delinquencies },
      { name: 'Utility Bill Payment Score', impact: utilityImpact, value: data.utility_score },
      { name: 'Income Stability Rating', impact: stabilityImpact, value: data.income_stability }
    ];

    // Format top factors
    const topFactors = factors
      .map(f => ({
        feature: f.name,
        impact: Math.abs(f.impact) * 15, // Scale for visual display
        feature_value: f.value,
        direction: f.impact >= 0 ? 'increases_risk' : 'reduces_risk'
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);

    return {
      probability_of_default: finalPd,
      risk_band: riskBand,
      decision,
      top_risk_factors: topFactors,
      threshold_used: 0.22,
      confidence: 0.88
    };
  };

  const getPrediction = async (currentData) => {
    setLoading(true);
    try {
      // API call to FastAPI ml microservice on port 5001
      const res = await axios.post('http://localhost:5001/predict', {
        monthly_income: parseFloat(currentData.monthly_income),
        income_stability: parseInt(currentData.income_stability),
        total_emi: parseFloat(currentData.total_emi),
        credit_limit: parseFloat(currentData.credit_limit),
        outstanding_balance: parseFloat(currentData.outstanding_balance),
        past_delinquencies: parseInt(currentData.past_delinquencies),
        months_since_last_dq: parseInt(currentData.months_since_last_dq),
        loan_amount_requested: parseFloat(currentData.loan_amount_requested),
        loan_tenure: parseInt(currentData.loan_tenure),
        upi_volume: parseFloat(currentData.upi_volume),
        ecommerce_spend: parseFloat(currentData.ecommerce_spend),
        utility_score: parseInt(currentData.utility_score)
      });
      setPrediction(res.data);
      setIsOffline(false);
    } catch (err) {
      // Auto-fallback to local model simulation
      const fallbackResult = calculateOfflinePrediction(currentData);
      setPrediction(fallbackResult);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // Trigger prediction on load or data changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      getPrediction(formData);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [formData]);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const loadPersona = (personaData) => {
    setFormData(personaData);
  };

  // Helper colors mapping
  const riskColor = prediction?.decision === 'Approved'
    ? 'text-emerald-500'
    : prediction?.decision === 'Rejected'
      ? 'text-rose-500'
      : 'text-amber-500';

  const riskGradient = prediction?.decision === 'Approved'
    ? 'from-emerald-500 to-teal-500 shadow-emerald-500/10'
    : prediction?.decision === 'Rejected'
      ? 'from-rose-500 to-red-600 shadow-rose-500/10'
      : 'from-amber-500 to-orange-500 shadow-amber-500/10';

  // Dynamic Underwriter Insights based on data
  const generateInsights = () => {
    const insights = [];
    const dti = formData.total_emi / formData.monthly_income;
    const lti = formData.loan_amount_requested / (formData.monthly_income * 12);
    const util = formData.outstanding_balance / formData.credit_limit;

    if (dti > 0.4) {
      insights.push({
        type: 'danger',
        text: `High Debt-to-Income ratio (${Math.round(dti * 100)}%). Recommend extending the loan tenure or reducing requested amount.`
      });
    } else {
      insights.push({
        type: 'success',
        text: `Conservative DTI ratio (${Math.round(dti * 100)}%) is supporting repayment capabilities.`
      });
    }

    if (util > 0.7) {
      insights.push({
        type: 'danger',
        text: `High credit limit utilization (${Math.round(util * 100)}%). This signals revolving debt stress.`
      });
    }

    if (formData.past_delinquencies > 0) {
      insights.push({
        type: 'warning',
        text: `Applicant has ${formData.past_delinquencies} past delinquencies. Months since last event: ${formData.months_since_last_dq} mo.`
      });
    }

    if (formData.utility_score > 85) {
      insights.push({
        type: 'success',
        text: `Excellent utility payment score (${formData.utility_score}/100) indicates high personal repayment discipline.`
      });
    }

    return insights;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">

      {/* ── TOP PRESETS BAR ── */}
      <div className="col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-2xl backdrop-blur-md transition-all duration-300 bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h4 className={`text-sm font-extrabold flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
            <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
            AI Underwriting Sandbox
          </h4>
          <p className="text-3xs text-slate-400 font-semibold mt-1">Select borrower presets to test decision behaviors in real-time</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {PERSONAS.map(p => (
            <button
              key={p.name}
              onClick={() => loadPersona(p.data)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${formData.monthly_income === p.data.monthly_income && formData.loan_amount_requested === p.data.loan_amount_requested
                  ? dark
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                  : dark
                    ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
            >
              <span className="text-sm">{p.icon}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── LEFT INPUT PANEL (Col 7) ── */}
      <div className={`col-span-12 lg:col-span-7 rounded-2xl border p-5 transition-all duration-300 ${dark ? 'border-slate-800/60 bg-slate-900/50 backdrop-blur-md' : 'border-slate-200/60 bg-white/70 backdrop-blur-md'
        }`}>
        {/* Navigation tabs inside input container */}
        <div className={`flex border-b pb-3.5 mb-5 gap-4 ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
          {[
            { id: 'financial', label: 'Financial Info', icon: DollarSign },
            { id: 'credit', label: 'Credit History', icon: Landmark },
            { id: 'alternative', label: 'Alternative Stats', icon: Percent },
          ].map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`flex items-center gap-1.5 bg-transparent border-0 cursor-pointer font-extrabold text-xs pb-1 transition-all relative ${activeGroup === g.id
                  ? dark ? 'text-white' : 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <g.icon className="w-3.5 h-3.5" />
              {g.label}
              {activeGroup === g.id && (
                <motion.div
                  layoutId="activeInputTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* ══ FINANCIAL GROUP ══ */}
        {activeGroup === 'financial' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            {/* Monthly Income */}
            <SliderInput
              label="Monthly Income (INR)"
              min={10000}
              max={300000}
              step={1000}
              value={formData.monthly_income}
              onChange={val => handleInputChange('monthly_income', val)}
              dark={dark}
              prefix="₹"
            />
            {/* Loan Amount Requested */}
            <SliderInput
              label="Requested Loan Amount (INR)"
              min={10000}
              max={500000}
              step={5000}
              value={formData.loan_amount_requested}
              onChange={val => handleInputChange('loan_amount_requested', val)}
              dark={dark}
              prefix="₹"
            />
            {/* Total EMI */}
            <SliderInput
              label="Total Existing EMI Obligations (Monthly)"
              min={0}
              max={60000}
              step={500}
              value={formData.total_emi}
              onChange={val => handleInputChange('total_emi', val)}
              dark={dark}
              prefix="₹"
            />
            {/* Loan Tenure */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-3xs uppercase font-extrabold tracking-wider text-slate-400">Loan Tenure</span>
                <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{formData.loan_tenure} Months</span>
              </div>
              <div className="grid grid-cols-5 gap-2.5">
                {[12, 24, 36, 48, 60].map(m => (
                  <button
                    key={m}
                    onClick={() => handleInputChange('loan_tenure', m)}
                    className={`py-2 border rounded-xl font-extrabold text-xs transition ${formData.loan_tenure === m
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-600 border-0 text-white shadow-md'
                        : dark
                          ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-655'
                      }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ CREDIT HISTORY GROUP ══ */}
        {activeGroup === 'credit' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            {/* Credit Limit */}
            <SliderInput
              label="Total Credit Card Limit (INR)"
              min={50000}
              max={500000}
              step={5000}
              value={formData.credit_limit}
              onChange={val => handleInputChange('credit_limit', val)}
              dark={dark}
              prefix="₹"
            />
            {/* Outstanding Balance */}
            <SliderInput
              label="Current Outstanding Credit Balance (INR)"
              min={0}
              max={400000}
              step={1000}
              value={formData.outstanding_balance}
              onChange={val => handleInputChange('outstanding_balance', val)}
              dark={dark}
              prefix="₹"
            />
            {/* Past Delinquencies */}
            <SliderInput
              label="Past Delinquencies (Total count)"
              min={0}
              max={5}
              step={1}
              value={formData.past_delinquencies}
              onChange={val => handleInputChange('past_delinquencies', val)}
              dark={dark}
              suffix=" events"
            />
            {/* Months Since Last DQ */}
            <SliderInput
              label="Months Since Last Delinquency"
              min={0}
              max={60}
              step={1}
              value={formData.months_since_last_dq}
              onChange={val => handleInputChange('months_since_last_dq', val)}
              dark={dark}
              suffix=" months ago"
              disabled={formData.past_delinquencies === 0}
            />
          </motion.div>
        )}

        {/* ══ ALTERNATIVE DATA GROUP ══ */}
        {activeGroup === 'alternative' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            {/* Income Stability Score */}
            <SliderInput
              label="Income Stability Index"
              min={0}
              max={100}
              step={1}
              value={formData.income_stability}
              onChange={val => handleInputChange('income_stability', val)}
              dark={dark}
              suffix="/100"
            />
            {/* Utility Payment Score */}
            <SliderInput
              label="Utility Bill Repayment Score"
              min={0}
              max={100}
              step={1}
              value={formData.utility_score}
              onChange={val => handleInputChange('utility_score', val)}
              dark={dark}
              suffix="/100"
            />
            {/* UPI Volume */}
            <SliderInput
              label="Average Monthly UPI Volume (INR)"
              min={0}
              max={200000}
              step={1000}
              value={formData.upi_volume}
              onChange={val => handleInputChange('upi_volume', val)}
              dark={dark}
              prefix="₹"
            />
            {/* E-Commerce Spend */}
            <SliderInput
              label="Average Monthly E-commerce Spend (INR)"
              min={0}
              max={50000}
              step={500}
              value={formData.ecommerce_spend}
              onChange={val => handleInputChange('ecommerce_spend', val)}
              dark={dark}
              prefix="₹"
            />
          </motion.div>
        )}
      </div>

      {/* ── RIGHT OUTPUT DECISION PANEL (Col 5) ── */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">

        {/* RISK DECISION PANEL */}
        <div className={`rounded-2xl border p-6 transition-all duration-300 relative overflow-hidden flex flex-col items-center text-center ${dark ? 'border-slate-800/60 bg-slate-900/50 backdrop-blur-md' : 'border-slate-200/60 bg-white/70 backdrop-blur-md'
          }`}>
          {/* Status badge representing prediction model source */}
          <span className={`absolute top-4 left-4 px-2 py-0.5 rounded-full text-4xs font-black uppercase tracking-widest border flex items-center gap-1 ${isOffline
              ? 'bg-amber-950/20 text-amber-400 border-amber-500/20'
              : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
            }`}>
            <span className={`w-1 h-1 rounded-full ${isOffline ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isOffline ? 'Offline Heuristic' : 'ML Model (XGB)'}
          </span>

          {/* Radial Probability Default Circle */}
          <div className="relative w-36 h-36 flex items-center justify-center mt-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="62"
                className={dark ? 'stroke-slate-800' : 'stroke-slate-100'}
                strokeWidth="10"
                fill="transparent"
              />
              {prediction && (
                <motion.circle
                  cx="72"
                  cy="72"
                  r="62"
                  stroke="url(#riskGradientSvg)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 62}
                  initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 62) * (1 - prediction.probability_of_default) }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              )}
              <defs>
                <linearGradient id="riskGradientSvg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={prediction?.decision === 'Approved' ? '#10B981' : prediction?.decision === 'Rejected' ? '#F43F5E' : '#F59E0B'} />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <p className={`text-3.5xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                {prediction ? `${Math.round(prediction.probability_of_default * 100)}%` : '—'}
              </p>
              <p className="text-4xs text-slate-400 uppercase font-black tracking-widest mt-0.5">Risk of Default</p>
            </div>
          </div>

          {/* Decision Notification Callout */}
          {prediction && (
            <motion.div
              key={prediction.decision}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mt-6 w-full p-4 rounded-xl flex items-center gap-3.5 border bg-gradient-to-br ${riskGradient} border-white/10 text-white`}
            >
              <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-md">
                {prediction.decision === 'Approved' ? (
                  <ShieldCheck className="w-6 h-6 text-white" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="text-left">
                <p className="text-3xs uppercase font-extrabold tracking-widest text-white/70">Underwriting Status</p>
                <p className="text-base font-black tracking-tight mt-0.5">{prediction.decision}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* SHAP EXPLANATIONS PANEL */}
        <div className={`rounded-2xl border p-5 transition-all duration-300 ${dark ? 'border-slate-800/60 bg-slate-900/50 backdrop-blur-md' : 'border-slate-200/60 bg-white/70 backdrop-blur-md'
          }`}>
          <h4 className={`text-xs font-extrabold mb-4 uppercase tracking-wider ${dark ? 'text-slate-350' : 'text-slate-700'}`}>
            Top Decision Drivers
          </h4>

          {loading ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
              <p className="text-4xs font-bold uppercase tracking-wider text-slate-400">Recalculating Features…</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {prediction?.top_risk_factors?.map((f, i) => {
                const direction = f.direction === 'increases_risk';
                return (
                  <div key={f.feature} className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition ${dark ? 'bg-slate-950/20 border-slate-850' : 'bg-slate-50/50 border-slate-100'
                    }`}>
                    <div className="flex-1">
                      <p className={`text-2xs font-extrabold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {f.feature}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-4xs font-black uppercase tracking-wider ${direction
                            ? dark ? 'bg-rose-950/30 text-rose-400' : 'bg-rose-50 text-rose-700'
                            : dark ? 'bg-emerald-950/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                          {direction ? 'Increases Risk' : 'Reduces Risk'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${direction
                          ? dark ? 'bg-rose-950/30 text-rose-400' : 'bg-rose-50 text-rose-750'
                          : dark ? 'bg-emerald-950/30 text-emerald-400' : 'bg-emerald-50 text-emerald-755'
                        }`}>
                        {direction ? <ArrowUpRight className="w-4.5 h-4.5" /> : <ArrowDownRight className="w-4.5 h-4.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DYNAMIC INSIGHTS PANEL */}
        <div className={`rounded-2xl border p-5 transition-all duration-300 ${dark ? 'border-slate-800/60 bg-slate-900/50' : 'border-slate-200/60 bg-white/70'
          }`}>
          <h4 className={`text-xs font-extrabold mb-3.5 uppercase tracking-wider ${dark ? 'text-slate-350' : 'text-slate-700'}`}>
            Underwriter Insights
          </h4>
          <ul className="flex flex-col gap-2.5 pl-0 m-0 list-none">
            {generateInsights().map((ins, i) => (
              <li key={i} className="flex gap-2.5 items-start text-xs font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${ins.type === 'danger' ? 'bg-rose-500' : ins.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                <span className={dark ? 'text-slate-300' : 'text-slate-655'}>{ins.text}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
}

// Sub-component helper for custom responsive slider input
function SliderInput({ label, min, max, step, value, onChange, dark, prefix = '', suffix = '', disabled = false }) {
  return (
    <div className={`flex flex-col gap-2.5 ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center text-3xs font-bold tracking-wider uppercase text-slate-400">
        <span>{label}</span>
        <span className={`text-xs font-extrabold ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>
          {prefix}{value?.toLocaleString()}{suffix}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer outline-none transition ${dark ? 'bg-slate-800' : 'bg-slate-100'
            }`}
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - min) / (max - min)) * 100}%, ${dark ? '#1e293b' : '#f1f5f9'} ${((value - min) / (max - min)) * 100}%, ${dark ? '#1e293b' : '#f1f5f9'} 100%)`
          }}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => {
            const v = parseFloat(e.target.value) || min;
            onChange(Math.min(Math.max(v, min), max));
          }}
          className={`w-20 px-2 py-1 text-center font-bold text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none ${dark
              ? 'bg-slate-950/40 border-slate-800 text-white focus:border-indigo-500'
              : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
            }`}
        />
      </div>
    </div>
  );
}
