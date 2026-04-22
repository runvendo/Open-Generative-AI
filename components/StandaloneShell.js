'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, getUserBalance } from 'studio';
import ApiKeyModal from './ApiKeyModal';

const TABS = [
  { id: 'image',   label: 'Image Studio' },
  { id: 'video',   label: 'Video Studio' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema',  label: 'Cinema Studio' },
];

const STORAGE_KEY = 'muapi_key';

// Vendo injects both at build time when this app is deployed through
// vendo.run. Their presence flips the app into managed mode: the key is
// a Vendo proxy key, the ApiKeyModal is bypassed, and the balance chip
// reads from the Vendo proxy's /balance endpoint.
const VENDO_KEY = process.env.NEXT_PUBLIC_MUAPI_API_KEY || '';
const VENDO_BASE = process.env.NEXT_PUBLIC_MUAPI_BASE_URL || '';
const IS_VENDO = Boolean(VENDO_KEY && VENDO_BASE);

const TOPUP_URL = 'https://vendo.run/billing';

export default function StandaloneShell() {
  const [apiKey, setApiKey] = useState(null);
  const [activeTab, setActiveTab] = useState('image');
  const [balance, setBalance] = useState(null);
  const [balanceSource, setBalanceSource] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const fetchBalance = useCallback(async (key) => {
    try {
      const data = await getUserBalance(key);
      setBalance(data.balance);
      setBalanceSource(data.source ?? null);
    } catch (err) {
      console.error('Balance fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
    if (IS_VENDO) {
      setApiKey(VENDO_KEY);
      fetchBalance(VENDO_KEY);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setApiKey(stored);
      fetchBalance(stored);
    }
  }, [fetchBalance]);

  const handleKeySave = useCallback((key) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    fetchBalance(key);
  }, [fetchBalance]);

  const handleKeyChange = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setBalance(null);
    setBalanceSource(null);
    setShowSettings(false);
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(() => fetchBalance(apiKey), 30000);
    return () => clearInterval(interval);
  }, [apiKey, fetchBalance]);

  useEffect(() => {
    if (!IS_VENDO || balance === null) return;
    if (balance <= 0) {
      toast.error(
        (t) => (
          <span>
            Out of Vendo credits.{' '}
            <a
              href={TOPUP_URL}
              target="_blank"
              rel="noreferrer"
              className="underline text-[#d9ff00]"
              onClick={() => toast.dismiss(t.id)}
            >
              Add credits
            </a>
          </span>
        ),
        { id: 'vendo-empty-balance', duration: 8000 },
      );
    }
  }, [balance]);

  if (!hasMounted) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin text-[#d9ff00] text-3xl">◌</div>
    </div>
  );

  if (!apiKey) {
    return <ApiKeyModal onSave={handleKeySave} />;
  }

  const balanceLabel = balance === null
    ? null
    : balanceSource === 'vendo'
      ? `$${Number(balance).toFixed(2)}`
      : `$${balance}`;

  return (
    <div className="h-screen bg-[#030303] flex flex-col overflow-hidden text-white">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-white/[0.03] flex items-center justify-between px-6 bg-black/20 backdrop-blur-md z-40">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:block">OpenGenerativeAI</span>
        </div>

        {/* Center: Navigation — flex row on mobile (scrollable), absolute-centered on md+ */}
        <nav className="flex flex-1 lg:flex-none items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar min-w-0 mx-2 lg:mx-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-4 text-[13px] font-medium transition-all whitespace-nowrap px-1 ${
                activeTab === tab.id
                  ? 'text-[#d9ff00]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d9ff00] rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <a
            href={balanceSource === 'vendo' ? TOPUP_URL : 'https://muapi.ai/billing'}
            target="_blank"
            rel="noreferrer"
            title={balanceSource === 'vendo' ? 'Vendo credit balance — click to top up' : 'Muapi.ai balance'}
            className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${balance !== null && balance <= 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            <div className="flex flex-col leading-none">
              {balanceLabel === null ? (
                <svg
                  className="h-3 w-3 animate-spin text-white/70"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label="Loading balance"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
                </svg>
              ) : (
                <span className="text-xs font-bold text-white/90">{balanceLabel}</span>
              )}
              {balanceSource === 'vendo' && balanceLabel !== null && (
                <span className="text-[9px] uppercase tracking-wider text-white/40">Vendo credits</span>
              )}
            </div>
          </a>

          {!IS_VENDO && (
            <div
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d9ff00] to-yellow-200 border border-white/20 cursor-pointer hover:scale-105 transition-transform"
            />
          )}
        </div>
      </header>

      {/* Studio Content */}
      <div className="flex-1 relative">
        {activeTab === 'image'   && <ImageStudio   apiKey={apiKey} />}
        {activeTab === 'video'   && <VideoStudio   apiKey={apiKey} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={apiKey} />}
        {activeTab === 'cinema'  && <CinemaStudio  apiKey={apiKey} />}

        {IS_VENDO && (
          <a
            href="https://vendo.run"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-4 text-[10px] uppercase tracking-widest text-white/30 hover:text-[#d9ff00] transition-colors"
          >
            Powered by Vendo
          </a>
        )}
      </div>

      {/* Settings Modal — hidden in Vendo mode since the key is managed */}
      {!IS_VENDO && showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-2">Settings</h2>
            <p className="text-white/40 text-[13px] mb-8">
              Manage your AI studio preferences and authentication.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-white/5 border border-white/[0.03] rounded-md p-4">
                <label className="block text-xs font-bold text-white/30 mb-2">
                  Active API Key
                </label>
                <div className="text-[13px] font-mono text-white/80">
                  {apiKey.slice(0, 8)}••••••••••••••••
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleKeyChange}
                className="flex-1 h-10 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all"
              >
                Change Key
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 h-10 rounded-md bg-white/5 text-white/80 hover:bg-white/10 text-xs font-semibold transition-all border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
