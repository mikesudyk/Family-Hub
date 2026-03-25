import { useState } from 'react';
import { apiFetch } from '../api/client';

const GREEN = '#4FA45A';

export default function ResetPasswordScreen({ token }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setError("Passwords don't match."); return; }
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex flex-col items-center mb-8 mt-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md" style={{ background: GREEN }}>
          <span className="text-3xl">🏠</span>
        </div>
        <div className="text-4xl font-black tracking-tighter leading-none">
          <span className="text-gray-900">aera</span><span style={{ color: GREEN }}>mea</span>
        </div>
      </div>

      <div className="text-2xl font-extrabold tracking-tight mb-1">New password</div>
      <div className="text-sm text-gray-400 mb-6">Choose a new password for your account.</div>

      {done ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-700 font-medium">
            Password updated! You can now sign in with your new password.
          </div>
          <button
            onClick={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }}
            className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white"
            style={{ background: GREEN }}
          >
            Go to Sign In
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-5">
            <input
              autoFocus
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Confirm new password"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
            />
            {error && <div className="text-xs text-red-500 px-1">{error}</div>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !password || !confirm}
            className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white disabled:opacity-50"
            style={{ background: GREEN }}
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
        </>
      )}
    </div>
  );
}
