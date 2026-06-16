'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Plus,
  Trash2,
  Edit,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  Sparkles,
  Clock,
  ToggleLeft,
  ToggleRight,
  Flame,
  Zap
} from 'lucide-react';

export default function NotificationCampaigns() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // State Management
  const [campaigns, setCampaigns] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState(null);
  
  // Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [time, setTime] = useState('12:00');
  const [isActive, setIsActive] = useState(true);
  
  // UI States
  const [activeField, setActiveField] = useState('message'); // 'title' or 'message'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileTab, setMobileTab] = useState('list'); // 'list' or 'configure'
  
  // Streak settings states
  const [notifStreakLevel1, setNotifStreakLevel1] = useState(true);
  const [notifStreakLevel2, setNotifStreakLevel2] = useState(true);
  const [streakLevel2Limit, setStreakLevel2Limit] = useState('100');
  const [savingStreak, setSavingStreak] = useState(false);

  useEffect(() => {
    if (user) {
      setNotifStreakLevel1(user.notifStreakLevel1 !== false);
      setNotifStreakLevel2(user.notifStreakLevel2 !== false);
      setStreakLevel2Limit(user.streakLevel2Limit?.toString() || '100');
    }
  }, [user]);

  const handleSaveStreakPreferences = async () => {
    setSavingStreak(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          notifStreakLevel1,
          notifStreakLevel2,
          streakLevel2Limit: parseFloat(streakLevel2Limit) || 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      if (res.ok) {
        setSuccessMsg('Streak preferences updated successfully!');
        if (refreshUser) await refreshUser();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update streak preferences.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSavingStreak(false);
    }
  };
  
  const titleInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch all campaigns on load
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/notifications/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      } else {
        console.error('Failed to fetch campaigns');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  // Handle Form Submission (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim() || !message.trim()) {
      setErrorMsg('Please enter both a title and message template.');
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditing 
        ? `/api/notifications/campaigns/${editingId}`
        : '/api/notifications/campaigns';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          frequency,
          time,
          isActive
        })
      });

      if (res.ok) {
        setSuccessMsg(isEditing ? 'Campaign updated successfully!' : 'Campaign created successfully!');
        resetForm();
        setMobileTab('list');
        await fetchCampaigns();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Campaign Active Status
  const handleToggleActive = async (campaign) => {
    try {
      const res = await fetch(`/api/notifications/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !campaign.isActive })
      });
      if (res.ok) {
        await fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Soft Delete Campaign
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this notification campaign?')) return;
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg('Campaign deleted successfully!');
        await fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Sending Test Push
  const handleSendTestPush = async (id) => {
    setTestingId(id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Test push notification dispatched to your registered device successfully!');
      } else {
        setErrorMsg(data.error || 'Failed to dispatch test notification.');
      }
    } catch (err) {
      setErrorMsg('Network error sending test notification.');
    } finally {
      setTestingId(null);
    }
  };

  // Populate form for editing
  const handleEditClick = (campaign) => {
    setIsEditing(true);
    setEditingId(campaign.id);
    setTitle(campaign.title);
    setMessage(campaign.message);
    setFrequency(campaign.frequency);
    setTime(campaign.time || '12:00');
    setIsActive(campaign.isActive);
    setErrorMsg('');
    setSuccessMsg('');
    setMobileTab('configure');
  };

  // Reset/Clear Form
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setMessage('');
    setFrequency('DAILY');
    setTime('12:00');
    setIsActive(true);
  };

  // Insert template variable at current input position or append
  const insertVariable = (variable) => {
    if (activeField === 'title') {
      setTitle(prev => prev + variable);
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    } else {
      setMessage(prev => prev + variable);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  };

  // Supported variables reference list
  const variables = [
    { code: '{{user_name}}', name: 'User Name', description: 'Name of the user', icon: User, color: 'text-violet-400' },
    { code: '{{left_salary}}', name: 'Remaining Balance', description: 'Current month salary + bonus minus deductions', icon: DollarSign, color: 'text-emerald-400' },
    { code: '{{savings}}', name: 'Invested Savings', description: 'Total general & cycle savings logged this month', icon: Sparkles, color: 'text-cyan-400' },
    { code: '{{stock_portfolio_value}}', name: 'Stocks Portfolio Value', description: 'Current valuation of stock market holdings', icon: TrendingUp, color: 'text-indigo-400' },
    { code: '{{stock_returns}}', name: 'Stocks ROI Return', description: 'Absolute profits/losses in stock holding', icon: DollarSign, color: 'text-teal-400' },
    { code: '{{stock_returns_pct}}', name: 'Stocks ROI %', description: 'Return rate percentage for stocks', icon: TrendingUp, color: 'text-purple-400' },
    { code: '{{today_spend}}', name: 'Today Spend', description: 'Total spending logged today', icon: DollarSign, color: 'text-rose-400' },
    { code: '{{this_week_spend}}', name: 'Week Spend', description: 'Total spending logged this week', icon: DollarSign, color: 'text-orange-400' },
    { code: '{{this_month_spend}}', name: 'Month Spend', description: 'Total spending logged this month', icon: DollarSign, color: 'text-red-400' },
    { code: '{{current_month}}', name: 'Current Month', description: 'E.g., June, July', icon: Calendar, color: 'text-amber-400' },
    { code: '{{current_year}}', name: 'Current Year', description: 'E.g., 2026', icon: Clock, color: 'text-rose-400' },
    { code: '{{streak_level_1}}', name: 'Zero Spending Streak', description: 'Streak days of 0 spending logged', icon: Flame, color: 'text-amber-500' },
    { code: '{{streak_level_2}}', name: 'Limit Spending Streak', description: 'Streak days under limit spending', icon: Zap, color: 'text-yellow-400' }
  ];

  // Helper function to mock render the template live
  const getLivePreview = (templateStr) => {
    if (!templateStr) return 'No template text entered yet...';
    const currencySym = user?.currency === 'INR' ? '₹' : '$';
    
    return templateStr
      .replaceAll('{{user_name}}', user?.displayName || 'John Doe')
      .replaceAll('{{left_salary}}', `${currencySym}2,450`)
      .replaceAll('{{savings}}', `${currencySym}800`)
      .replaceAll('{{stock_portfolio_value}}', `${currencySym}12,500`)
      .replaceAll('{{stock_returns}}', `+${currencySym}450`)
      .replaceAll('{{stock_returns_pct}}', `+3.6%`)
      .replaceAll('{{today_spend}}', `${currencySym}80`)
      .replaceAll('{{this_week_spend}}', `${currencySym}350`)
      .replaceAll('{{this_month_spend}}', `${currencySym}1,200`)
      .replaceAll('{{current_month}}', new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()))
      .replaceAll('{{current_year}}', new Date().getFullYear().toString())
      .replaceAll('{{streak_level_1}}', '5')
      .replaceAll('{{streak_level_2}}', '3');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 pb-24 md:pb-12 text-left">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-xl text-white">
              <Bell className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Notification Campaigns</h1>
              <p className="text-slate-400 text-sm mt-1 font-medium">
                Create and manage custom automated OneSignal push notifications powered by real-time ledger & stock portfolio data.
              </p>
            </div>
          </div>
        </div>

        {/* Global Messages */}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Mobile Tabs Toggle (Only visible on mobile) */}
        <div className="lg:hidden flex p-1 glass-card mb-6">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'list'
                ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Active ({campaigns.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('configure')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'configure'
                ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isEditing ? 'Modify Trigger' : 'Configure New'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Campaigns List (7 Columns) */}
          <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'list' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Active Campaigns</h2>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-xs font-bold hover:text-white transition-all cursor-pointer"
                >
                  Reset Form to Add New
                </button>
              )}
            </div>

            {fetching ? (
              <div className="glass-card p-12 flex flex-col items-center justify-center border border-white/5">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-3" />
                <span className="text-slate-400 text-sm font-semibold">Loading campaigns...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="glass-card p-12 text-center border border-white/5 flex flex-col items-center justify-center">
                <Bell className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-white font-bold text-base">No Campaign Triggers Configured</h3>
                <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed">
                  Start sending scheduled push alerts by filling out the campaign form to your right. Add variables to customize messages.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <motion.div
                    key={campaign.id}
                    layout
                    className={`glass-card p-6 border transition-all relative overflow-hidden ${
                      campaign.isActive 
                        ? 'border-white/10 hover:border-violet-500/35'
                        : 'border-white/5 opacity-60'
                    }`}
                  >
                    {/* Top highlight bar */}
                    {campaign.isActive && (
                      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-violet-500 to-cyan-400" />
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-2">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-white">{campaign.title}</h3>
                          <span className="px-2 py-0.5 bg-violet-600/15 border border-violet-500/20 text-violet-400 rounded-full text-[9px] font-extrabold uppercase tracking-wide">
                            {campaign.frequency}
                          </span>
                          <span className="px-2 py-0.5 bg-cyan-600/15 border border-cyan-500/20 text-cyan-400 rounded-full text-[9px] font-extrabold uppercase tracking-wide">
                            🕒 {campaign.time || '12:00'}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-2 font-medium bg-white/[0.02] p-3 rounded-lg border border-white/[0.05] leading-relaxed font-mono break-words">
                          {campaign.message}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500 font-semibold">
                          <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                          {campaign.lastSentAt && (
                            <span className="text-violet-400">
                              Last Sent: {new Date(campaign.lastSentAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.04] w-full md:w-auto justify-end">
                        {/* Toggle active switch */}
                        <button
                          onClick={() => handleToggleActive(campaign)}
                          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer flex items-center gap-1.5"
                          title={campaign.isActive ? 'Deactivate campaign' : 'Activate campaign'}
                        >
                          {campaign.isActive ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-500" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleEditClick(campaign)}
                          className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Edit campaign template"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Test Push */}
                        <button
                          disabled={testingId === campaign.id}
                          onClick={() => handleSendTestPush(campaign.id)}
                          className="p-2 bg-gradient-to-tr from-cyan-600/10 to-violet-600/10 hover:from-cyan-600/20 hover:to-violet-600/20 border border-violet-500/25 rounded-xl text-cyan-400 hover:text-white transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Trigger a test push now"
                        >
                          {testingId === campaign.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Streak Configurations Card */}
            <div className="glass-card p-6 border border-white/5 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500 animate-pulse" /> Spending Streak Configurations
                </h2>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  Configure alerts and daily spending thresholds to track your financial discipline.
                </p>
              </div>

              <div className="space-y-4">
                {/* Level 1 Settings */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 mt-0.5">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Level 1: Zero Spend Notifications</h4>
                      <p className="text-slate-500 text-[11px] font-medium leading-normal mt-0.5">
                        Get daily alerts for consecutive days with zero spending logged. (0 {user?.currency === 'INR' ? 'rs' : 'USD'} default)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifStreakLevel1(!notifStreakLevel1)}
                    className="cursor-pointer"
                  >
                    {notifStreakLevel1 ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Level 2 Settings */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 mt-0.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Level 2: Limit Spend Notifications</h4>
                        <p className="text-slate-500 text-[11px] font-medium leading-normal mt-0.5">
                          Get daily alerts when you stay under your custom daily spending limit.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifStreakLevel2(!notifStreakLevel2)}
                      className="cursor-pointer"
                    >
                      {notifStreakLevel2 ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Level 2 Limit Input */}
                  <div className="pt-2 border-t border-white/[0.03] flex items-center justify-between gap-4 flex-wrap">
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Daily Spend Threshold ({user?.currency === 'INR' ? '₹' : '$'})
                    </label>
                    <input
                      type="number"
                      value={streakLevel2Limit}
                      onChange={(e) => setStreakLevel2Limit(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-32 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveStreakPreferences}
                disabled={savingStreak}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-black tracking-wider text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/10"
              >
                {savingStreak ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  'Save Streak Preferences'
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Create/Edit Form & Ref variables (5 Columns) */}
          <div className={`lg:col-span-5 space-y-6 ${mobileTab === 'configure' ? 'block' : 'hidden lg:block'}`}>
            {/* Form */}
            <div className="glass-card p-6 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-cyan-400" />
              
              <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4">
                {isEditing ? 'Modify Campaign' : 'Configure New Campaign'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title field */}
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Notification Title Template
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={() => setActiveField('title')}
                    placeholder="e.g. Budget Alert! 🚨"
                    className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-semibold"
                  />
                </div>

                {/* Message field */}
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Message Template (With Variables)
                  </label>
                  <textarea
                    ref={messageInputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onFocus={() => setActiveField('message')}
                    placeholder="e.g. Hey {{user_name}}, you have {{left_salary}} remaining of your salary."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-semibold resize-none"
                  />
                </div>

                {/* Inline Live Preview */}
                <div className="p-3.5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Notification Preview</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Device Mock</span>
                  </div>
                  
                  <div className="bg-slate-905 bg-slate-900/90 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start text-left shadow-lg">
                    <div className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white shrink-0 mt-0.5">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">
                          MonthlyMoney
                        </span>
                        <span className="text-[8px] text-slate-500 font-bold">now</span>
                      </div>
                      <span className="block text-xs font-black text-white mt-1 truncate">
                        {title ? getLivePreview(title) : 'Notification Title Preview'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 break-words whitespace-pre-wrap leading-relaxed">
                        {getLivePreview(message)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dropdown Options for frequency & time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      Send Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-all font-semibold"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Every 7 Days</option>
                      <option value="MONTHLY">Every Month</option>
                      <option value="SIX_MONTHS">Every 6 Months</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      Target Send Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 accent-violet-500 rounded cursor-pointer"
                    />
                    <span className="text-white text-xs font-bold uppercase tracking-wide">
                      Active Trigger
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl font-black tracking-wider text-xs uppercase transition-all btn-glow shadow-lg shadow-violet-600/20 flex items-center justify-center cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : isEditing ? (
                    'Save Campaign Updates'
                  ) : (
                    'Create Campaign Trigger'
                  )}
                </button>
              </form>
            </div>

            {/* Variable insertion widget */}
            <div className="glass-card p-6 border border-white/5">
              <h3 className="text-sm font-black text-white tracking-wider uppercase border-b border-white/5 pb-2 mb-3">
                Template Variables (Insert into {activeField})
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mb-4 leading-relaxed">
                Click any variable card below to insert it at the end of your currently active field input (Title or Message).
              </p>

              <div className="grid grid-cols-2 gap-2">
                {variables.map((variable) => {
                  const Icon = variable.icon;
                  return (
                    <button
                      key={variable.code}
                      type="button"
                      onClick={() => insertVariable(variable.code)}
                      className="p-3 bg-slate-950/40 border border-white/5 hover:border-violet-500/20 rounded-xl text-left transition-all hover:bg-slate-950/60 flex flex-col justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${variable.color}`} />
                        <span className="text-[10px] font-extrabold text-white truncate group-hover:text-violet-400 transition-colors">
                          {variable.name}
                        </span>
                      </div>
                      <code className="text-[9px] font-mono text-cyan-400 mt-2 block select-all">
                        {variable.code}
                      </code>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-xs text-center font-medium flex flex-col items-center gap-1.5 justify-center">
          <span>© {new Date().getFullYear()} Manage Monthly Money. OneSignal Trigger Hub.</span>
        </div>
      </footer>
    </div>
  );
}
