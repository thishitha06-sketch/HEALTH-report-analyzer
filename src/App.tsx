/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Leaf, 
  Activity, 
  FileText, 
  TrendingUp, 
  MessageCircle, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X, 
  Lock, 
  Mail, 
  Plus, 
  ChevronRight,
  Sparkles,
  Shield,
  Clock
} from 'lucide-react';

import { User, MedicalReport, UserSettings, UserProfile as ProfileType } from './types';
import LandingPage from './components/LandingPage';
import Dashboard from './db/db_dashboard'; // dashboard component
import ReportAnalyzer from './components/ReportAnalyzer';
import HistoryTrends from './components/HistoryTrends';
import AIChat from './components/AIChat';
import UserProfile from './components/UserProfile';
import Settings from './components/Settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportForAnalyzer, setSelectedReportForAnalyzer] = useState<MedicalReport | null>(null);
  const [manualBloodPressures, setManualBloodPressures] = useState<{ date: string; systolic: number; diastolic: number }[]>([
    { date: '2026-06-15T10:30:00Z', systolic: 118, diastolic: 76 },
    { date: '2026-07-02T14:15:00Z', systolic: 122, diastolic: 78 }
  ]);
  
  const [settings, setSettings] = useState<UserSettings>({
    darkMode: false,
    notifications: true,
    language: 'English'
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAge, setAuthAge] = useState('28');
  const [authGender, setAuthGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Load session on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('nirva_token');
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    }
  }, []);

  // Fetch reports when user changes
  useEffect(() => {
    if (token) {
      fetchReports(token);
    }
  }, [token]);

  const fetchProfile = async (authToken: string) => {
    try {
      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        // Stale token
        handleSignOut();
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  const fetchReports = async (authToken: string) => {
    try {
      const response = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok && data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to fetch medical reports", err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const url = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = authMode === 'login' 
      ? { email: authEmail } 
      : { email: authEmail, name: authName, age: Number(authAge), gender: authGender };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      const verifiedUser = data.user;
      localStorage.setItem('nirva_token', verifiedUser.id);
      setToken(verifiedUser.id);
      setUser(verifiedUser);
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthName('');
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Quick login as pre-seeded Emily Watson
    localStorage.setItem('nirva_token', 'user-123');
    setToken('user-123');
    fetchProfile('user-123');
    setShowAuthModal(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem('nirva_token');
    setUser(null);
    setToken(null);
    setReports([]);
    setSelectedReportId(null);
    setSelectedReportForAnalyzer(null);
    setIsMobileMenuOpen(false);
  };

  const handleUpdateProfile = async (updatedProfile: ProfileType) => {
    if (!token) return;
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profile: updatedProfile })
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAddProfile = async (newProfile: ProfileType) => {
    if (!token) return;
    try {
      const response = await fetch('/api/profile/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profile: newProfile })
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.error || "Failed to add profile.");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!token) return;
    try {
      const response = await fetch('/api/profile/delete-specific', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profileId })
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.error || "Failed to delete profile.");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleSelectActiveProfile = async (profileId: string) => {
    if (!token) return;
    try {
      const response = await fetch('/api/profile/select', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profileId })
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      } else {
        throw new Error(data.error || "Failed to switch active profile.");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteAccount = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAnalysisComplete = (newReport: MedicalReport) => {
    setReports(prev => [newReport, ...prev]);
  };

  const handleAddBloodPressure = (systolic: number, diastolic: number) => {
    const newBp = {
      date: new Date().toISOString(),
      systolic,
      diastolic
    };
    setManualBloodPressures(prev => [newBp, ...prev]);
  };

  const handleViewReportFromDashboard = (report: MedicalReport) => {
    setSelectedReportForAnalyzer(report);
    setActiveTab('analyze');
  };

  // Nav items configuration
  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Activity },
    { id: 'analyze', name: 'AI Report Analyzer', icon: FileText },
    { id: 'trends', name: 'Historical Biometrics', icon: TrendingUp },
    { id: 'chat', name: 'AI Health Chat', icon: MessageCircle },
    { id: 'profile', name: 'My Health Profile', icon: UserIcon },
    { id: 'settings', name: 'Workspace Settings', icon: SettingsIcon },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fcfaf7]">
        <LandingPage 
          onGetStarted={() => { setAuthMode('signup'); setShowAuthModal(true); }}
          onLoginClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
        />

        {/* Beautiful Natural Tones Auth Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay background */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAuthModal(false)}
                className="absolute inset-0 bg-[#1a3a34]/40 backdrop-blur-sm"
              />

              {/* Modal Box */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#e2e8f0] p-8 z-10"
              >
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-6 right-6 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-[#3a7d6e] rounded-full flex items-center justify-center text-white mx-auto mb-3 shadow-md">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold text-[#1a3a34]">
                    {authMode === 'login' ? 'Welcome to Nirva' : 'Create Your Health Workspace'}
                  </h3>
                  <p className="text-stone-500 text-sm mt-1">
                    {authMode === 'login' ? 'Sign in to access your biological charts' : 'Start tracking biometric trends safely'}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm text-center">
                      {authError}
                    </div>
                  )}

                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-500 ml-1">Full Name</label>
                      <div className="relative">
                        <input 
                          type="text"
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full bg-[#fcfaf7] border border-[#e2e8f0] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a7d6e]/20 focus:border-[#3a7d6e] transition-all text-stone-850"
                          placeholder="Jane Doe"
                        />
                        <UserIcon className="w-4 h-4 text-stone-450 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-500 ml-1">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-[#fcfaf7] border border-[#e2e8f0] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a7d6e]/20 focus:border-[#3a7d6e] transition-all text-stone-850"
                        placeholder="yourname@gmail.com"
                      />
                      <Mail className="w-4 h-4 text-stone-450 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-stone-500 ml-1">Age</label>
                        <input 
                          type="number"
                          required
                          value={authAge}
                          onChange={(e) => setAuthAge(e.target.value)}
                          className="w-full bg-[#fcfaf7] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm focus:outline-none text-stone-850"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-stone-500 ml-1">Biological Sex</label>
                        <select 
                          value={authGender}
                          onChange={(e) => setAuthGender(e.target.value as any)}
                          className="w-full bg-[#fcfaf7] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm focus:outline-none text-stone-850 appearance-none"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-[#3a7d6e] hover:bg-[#2d6156] text-white font-medium text-sm py-3 rounded-xl shadow-md transition-all hover:shadow-lg mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isAuthLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In Securely' : 'Create Workspace'}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-150"></div></div>
                  <span className="relative bg-white px-3 text-xs text-stone-400 font-semibold uppercase tracking-wider">or test the platform</span>
                </div>

                {/* Demo Sign In Quick Button */}
                <button
                  onClick={handleDemoLogin}
                  className="w-full border-2 border-[#3a7d6e] text-[#3a7d6e] hover:bg-[#f0f4f3] font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  Explore Demo (Emily Watson, 28)
                </button>

                <div className="text-center text-xs text-stone-500 mt-4">
                  {authMode === 'login' ? (
                    <p>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-[#3a7d6e] hover:underline font-bold">Sign Up Free</button></p>
                  ) : (
                    <p>Already have an account? <button onClick={() => setAuthMode('login')} className="text-[#3a7d6e] hover:underline font-bold">Sign In</button></p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Active Screen Layout Renderer
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            reports={reports} 
            onViewReport={handleViewReportFromDashboard} 
            onNavigateToTab={(tab) => {
              if (tab === 'chat') {
                setSelectedReportId(null);
              }
              setActiveTab(tab);
            }} 
          />
        );
      case 'analyze':
        return (
          <ReportAnalyzer 
            token={token || ''} 
            onAnalysisComplete={handleAnalysisComplete}
            selectedReport={selectedReportForAnalyzer}
            onClearSelectedReport={() => setSelectedReportForAnalyzer(null)}
            onNavigateToChat={(reportId) => {
              setSelectedReportId(reportId);
              setActiveTab('chat');
            }}
            user={user}
            language={settings.language}
          />
        );
      case 'trends':
        return (
          <HistoryTrends 
            reports={reports}
            manualBloodPressures={manualBloodPressures}
            onAddBloodPressure={handleAddBloodPressure}
          />
        );
      case 'chat':
        return (
          <AIChat 
            reports={reports}
            selectedReportId={selectedReportId}
            onSelectReportId={setSelectedReportId}
            token={token || ''}
            activeProfileId={user?.profile?.id}
            language={settings.language}
          />
        );
      case 'profile':
        return (
          <UserProfile 
            user={user}
            onUpdateProfile={handleUpdateProfile}
            onAddProfile={handleAddProfile}
            onDeleteProfile={handleDeleteProfile}
            onSelectProfile={handleSelectActiveProfile}
          />
        );
      case 'settings':
        return (
          <Settings 
            settings={settings}
            onUpdateSettings={setSettings}
            onDeleteAccount={handleDeleteAccount}
            onSignOut={handleSignOut}
          />
        );
      default:
        return <div className="p-8 text-center">Screen under active synthesis.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] text-[#2d3648] flex flex-col md:flex-row">
      
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden flex items-center justify-between px-6 h-16 bg-white border-b border-[#e2e8f0] z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#3a7d6e] rounded-full flex items-center justify-center text-white">
            <Leaf className="w-4.5 h-4.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#1a3a34] font-serif">Nirva</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-50"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#1a3a34]/30 backdrop-blur-xs"
            />
            {/* Drawer Content */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="relative bg-[#fcfaf7] w-4/5 max-w-xs h-full flex flex-col justify-between border-r border-[#e2e8f0] z-10 p-6 shadow-2xl"
            >
              <div>
                <div className="flex items-center gap-2 mb-8 border-b border-[#e2e8f0] pb-4">
                  <div className="w-9 h-9 bg-[#3a7d6e] rounded-full flex items-center justify-center text-white">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-[#1a3a34] font-serif">Nirva Health</span>
                </div>

                <nav className="space-y-1.5">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive 
                            ? 'bg-[#f0f4f3] text-[#3a7d6e] border-l-4 border-[#3a7d6e]' 
                            : 'text-stone-650 hover:bg-stone-100/50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-[#3a7d6e]' : 'text-stone-400'}`} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* User Bio at Bottom */}
              <div className="border-t border-[#e2e8f0] pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#3a7d6e]/10 border border-[#d3dfdc] rounded-full flex items-center justify-center text-[#3a7d6e] font-serif font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-stone-800 truncate">{user.name}</p>
                    <p className="text-[10px] text-stone-450 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-100 hover:bg-red-50 text-red-750 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-r border-[#e2e8f0] h-screen sticky top-0 p-6 flex-shrink-0 z-20">
        <div>
          {/* Logo brand */}
          <div className="flex items-center gap-2 mb-8 border-b border-[#e2e8f0] pb-5">
            <div className="w-9 h-9 bg-[#3a7d6e] rounded-full flex items-center justify-center text-white shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1a3a34] font-serif">Nirva Health</span>
          </div>

          {/* Links list */}
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#f0f4f3] text-[#3a7d6e] border-l-4 border-[#3a7d6e]' 
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#3a7d6e]' : 'text-stone-400'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User baseline profile details card at sidebar bottom */}
        <div className="border-t border-[#e2e8f0] pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f0f4f3] border border-[#d3dfdc] rounded-full flex items-center justify-center text-[#3a7d6e] font-serif font-semibold text-lg flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-bold text-stone-850 truncate">{user.name}</p>
              <p className="text-[10px] text-stone-450 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-stone-200 hover:bg-stone-50 hover:border-red-200 text-stone-500 hover:text-red-750 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Workspace
          </button>
        </div>
      </aside>

      {/* Main Container Right Side */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Dynamic header row on desktop */}
        <header className="hidden md:flex justify-between items-center px-10 h-20 border-b border-[#e2e8f0]/40 bg-white/50 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold">
            <span>Workspace</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-stone-700 capitalize">{activeTab}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-stone-500">
            <span className="flex items-center gap-1.5 bg-[#f0f4f3] px-3 py-1.5 rounded-lg border border-[#d3dfdc] text-[#3a7d6e]">
              <Shield className="w-3.5 h-3.5" /> HIPAA Compliance Active
            </span>
            <span className="flex items-center gap-1.5 bg-stone-100/50 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-stone-600">
              <Clock className="w-3.5 h-3.5 text-stone-400" /> UTC: {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Dynamic Inner Tab View */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-10 relative">
          {user?.profile?.isIncomplete && activeTab !== 'profile' && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-stone-850 text-sm">Incomplete Health Profile</p>
                  <p className="text-xs text-stone-600 mt-0.5">Complete your health profile for more personalized reference ranges.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('profile')}
                className="bg-amber-850 hover:bg-amber-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                Complete Profile
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {renderActiveScreen()}
        </div>
      </main>

    </div>
  );
}
