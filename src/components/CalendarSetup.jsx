import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const GREEN = '#4FA45A';
const DARK  = '#111827';
const API   = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CalendarSetup({ onDone, inSettings = false }) {
  const { calendarConnections, pendingInviteUrl, setPendingInviteUrl } = useApp();
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyInviteUrl() {
    navigator.clipboard.writeText(pendingInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const googleConnected = calendarConnections?.some(c => c.provider === 'google' && c.connected);

  function connectGoogle() {
    setConnecting(true);
    const token = localStorage.getItem('aeramea_token');
    // Full-page redirect to OAuth flow — server reads token from state param
    window.location.href = `${API}/api/calendar/connect/google?token=${token}`;
  }

  return (
    <div className="flex flex-col h-full p-6">
      {inSettings ? (
        <button
          onClick={onDone}
          className="flex items-center gap-1 text-sm text-gray-400 bg-transparent border-none cursor-pointer mb-8 self-start"
        >
          ← Back
        </button>
      ) : (
        <div className="text-sm font-black tracking-tighter mb-8">
          <span className="text-gray-900">aera</span><span style={{ color: GREEN }}>mea</span>
        </div>
      )}

      <div className="flex-1">
        <div className="text-2xl font-extrabold tracking-tight mb-1">Calendar Connections</div>
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

        {/* iCloud — coming soon */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">
              🍎
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900">iCloud Calendar</div>
              <div className="text-xs text-gray-400 mt-0.5">Apple Calendar, iCloud</div>
            </div>
            <div className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
              Coming soon
            </div>
          </div>
        </div>
      </div>

      {!inSettings && (
        <div className="space-y-2 pt-4">
          <button
            onClick={onDone}
            className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white"
            style={{ background: GREEN }}
          >
            {googleConnected ? "Let's go! →" : 'Continue to hub →'}
          </button>
          {!googleConnected && (
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
