import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../api/client';
import { BackButton } from './ui';

const GREEN = '#4FA45A';
const DARK  = '#111827';
const API   = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── iCloud connect flow ───────────────────────────────────────────────────────

function ICloudConnectPanel({ onConnected }) {
  const [step, setStep]           = useState('form');   // 'form' | 'pick' | 'connecting' | 'done'
  const [appleId, setAppleId]     = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [calendars, setCalendars] = useState([]);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleDiscover() {
    if (!appleId.trim() || !appPassword.trim()) return;
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/api/calendar/connect/icloud/discover', {
        method: 'POST',
        body: JSON.stringify({ appleId: appleId.trim(), appPassword: appPassword.trim() }),
      });
      setCalendars(data.calendars);
      setStep('pick');
    } catch (err) {
      setError(err.message || 'Could not connect to iCloud — check your credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(cal) {
    setStep('connecting'); setError('');
    try {
      await apiFetch('/api/calendar/connect/icloud', {
        method: 'POST',
        body: JSON.stringify({
          appleId: appleId.trim(),
          appPassword: appPassword.trim(),
          calendarUrl: cal.url,
          calendarName: cal.name,
        }),
      });
      setStep('done');
      onConnected();
    } catch (err) {
      setError(err.message || 'Failed to save connection');
      setStep('pick');
    }
  }

  if (step === 'done') return null;

  if (step === 'connecting') {
    return <div className="text-xs text-gray-500 text-center py-3">Connecting and syncing…</div>;
  }

  if (step === 'pick') {
    return (
      <div className="mt-3 space-y-1.5">
        <div className="text-xs font-bold text-gray-500 mb-2">Choose a calendar to sync:</div>
        {calendars.map(cal => (
          <button
            key={cal.url}
            onClick={() => handleConnect(cal)}
            className="w-full text-left text-sm font-semibold bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 border-none cursor-pointer text-gray-900"
          >
            📅 {cal.name}
          </button>
        ))}
        <button onClick={() => setStep('form')} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">
          ← Back
        </button>
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>
    );
  }

  // step === 'form'
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs text-gray-500 leading-relaxed">
        You need an <strong>app-specific password</strong> — not your regular Apple ID password.{' '}
        <a
          href="https://appleid.apple.com/account/manage"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Generate one at appleid.apple.com
        </a>
        {' '}→ Sign-In and Security → App-Specific Passwords.
      </div>
      <input
        type="email"
        value={appleId}
        onChange={e => setAppleId(e.target.value)}
        placeholder="Apple ID (your iCloud email)"
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-gray-400"
      />
      <input
        type="password"
        value={appPassword}
        onChange={e => setAppPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleDiscover()}
        placeholder="App-specific password (xxxx-xxxx-xxxx-xxxx)"
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-gray-400"
      />
      {error && <div className="text-xs text-red-500">{error}</div>}
      <button
        onClick={handleDiscover}
        disabled={loading || !appleId.trim() || !appPassword.trim()}
        className="w-full text-sm font-bold py-2.5 rounded-xl border-none cursor-pointer text-white disabled:opacity-40"
        style={{ background: DARK }}
      >
        {loading ? 'Connecting…' : 'Fetch Calendars →'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarSetup({ onDone, inSettings = false }) {
  const { calendarConnections, reloadConnections, refresh, pendingInviteUrl, setPendingInviteUrl } = useApp();
  const [connecting, setConnecting]         = useState(false);
  const [showICloudForm, setShowICloudForm] = useState(false);
  const [copied, setCopied]                 = useState(false);

  function copyInviteUrl() {
    navigator.clipboard.writeText(pendingInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const googleConnected = calendarConnections?.some(c => c.provider === 'google' && c.connected);
  const anyConnected    = calendarConnections?.some(c => c.connected);

  function connectGoogle() {
    setConnecting(true);
    const token = localStorage.getItem('aeramea_token');
    // Full-page redirect to OAuth flow — server reads token from state param
    window.location.href = `${API}/api/calendar/connect/google?token=${token}`;
  }

  return (
    <div className="flex flex-col h-full p-6">
      {inSettings ? (
        <div className="flex items-center gap-2 mb-5">
          <BackButton />
          <div className="text-xl font-extrabold tracking-tight flex-1">Calendar Connections</div>
        </div>
      ) : (
        <div className="text-sm font-black tracking-tighter mb-8">
          <span className="text-gray-900">aera</span><span style={{ color: GREEN }}>mea</span>
        </div>
      )}

      <div className="flex-1">
        {!inSettings && <div className="text-2xl font-extrabold tracking-tight mb-1">Calendar Connections</div>}
        <div className="text-sm text-gray-400 mb-4">
          Two-way sync keeps your family hub and personal calendars in perfect time
        </div>

        {pendingInviteUrl && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
            <div className="text-xs font-bold text-amber-700 mb-1">Partner invite link</div>
            <div className="text-xs text-amber-600 mb-2">Email isn't set up yet — share this link directly with your partner:</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-500 font-mono truncate border border-amber-100">
                {pendingInviteUrl}
              </div>
              <button
                onClick={copyInviteUrl}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-white flex-shrink-0"
                style={{ background: copied ? '#4FA45A' : '#111827' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setPendingInviteUrl(null)}
              className="text-xs text-amber-400 bg-transparent border-none cursor-pointer mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Google */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">
              📅
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900">Google Calendar</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {googleConnected ? 'Connected — syncing events' : 'Gmail, Google Workspace'}
              </div>
            </div>
            {googleConnected ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                <span>✓</span> Connected
              </div>
            ) : (
              <button
                onClick={connectGoogle}
                disabled={connecting}
                className="text-xs font-bold px-3 py-2 rounded-xl border-none cursor-pointer text-white disabled:opacity-50"
                style={{ background: DARK }}
              >
                {connecting ? 'Opening…' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* Outlook — coming soon */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-lg">
              📧
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900">Outlook / Microsoft</div>
              <div className="text-xs text-gray-400 mt-0.5">Office 365, Outlook.com</div>
            </div>
            <div className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
              Coming soon
            </div>
          </div>
        </div>

        {/* iCloud */}
        {(() => {
          const icloudConnected = calendarConnections?.some(c => c.provider === 'icloud' && c.connected);
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">
                  🍎
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">iCloud Calendar</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {icloudConnected ? 'Connected — syncing events' : 'Apple Calendar, iCloud'}
                  </div>
                </div>
                {icloudConnected ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
                    <span>✓</span> Connected
                  </div>
                ) : (
                  <button
                    onClick={() => setShowICloudForm(f => !f)}
                    className="text-xs font-bold px-3 py-2 rounded-xl border-none cursor-pointer text-white"
                    style={{ background: DARK }}
                  >
                    {showICloudForm ? 'Cancel' : 'Connect'}
                  </button>
                )}
              </div>
              {showICloudForm && !icloudConnected && (
                <ICloudConnectPanel
                  onConnected={() => {
                    setShowICloudForm(false);
                    refresh();
                  }}
                />
              )}
            </div>
          );
        })()}
      </div>

      {!inSettings && (
        <div className="space-y-2 pt-4">
          <button
            onClick={onDone}
            className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white"
            style={{ background: GREEN }}
          >
            {anyConnected ? "Let's go! →" : 'Continue to hub →'}
          </button>
          {!anyConnected && (
            <button
              onClick={onDone}
              className="w-full text-sm text-gray-400 bg-transparent border-none cursor-pointer py-2 text-center"
            >
              Skip for now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
