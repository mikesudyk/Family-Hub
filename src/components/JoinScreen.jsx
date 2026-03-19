import { useState } from 'react';
import { apiFetch } from '../api/client';

const AVATAR_EMOJIS = [
  '👨', '👩', '🧑', '👱', '👱‍♀️', '🧔', '🧔‍♀️',
  '👦', '👧', '🧒', '👶', '👨‍🦱', '👩‍🦱',
  '👨‍🦰', '👩‍🦰', '👨‍🦳', '👩‍🦳', '👨‍🦲', '👩‍🦲',
  '🧓', '🦸', '🦸‍♀️', '🧙', '🧙‍♀️', '🤴', '👸',
];

export default function JoinScreen({ token, onJoined }) {
  const [name, setName]       = useState('');
  const [avatar, setAvatar]   = useState('👩');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [status, setStatus]   = useState('idle'); // idle | joining | error
  const [errorMsg, setErrorMsg]   = useState('');

  async function handleJoin() {
    if (!name.trim() || !password) return;
    if (password !== confirm) { setErrorMsg('Passwords do not match'); return; }
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters'); return; }
    setStatus('joining'); setErrorMsg('');
    try {
      const data = await apiFetch(`/api/auth/join/${token}`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), password, avatar }),
      });
      onJoined(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join. The link may have expired.');
      setStatus('error');
    }
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#4FA45A' }}>
          <span className="text-3xl">🏠</span>
        </div>
        <div className="text-2xl font-extrabold tracking-tight mb-1">Join your family hub</div>
        <div className="text-sm text-gray-400">Set up your profile to get started</div>
      </div>

      <div className="space-y-4 flex-1">
        {/* Avatar picker */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pick your avatar</div>
          <div className="grid grid-cols-7 gap-1.5">
            {AVATAR_EMOJIS.map(em => (
              <button
                key={em}
                onClick={() => setAvatar(em)}
                className={`w-9 h-9 text-xl flex items-center justify-center rounded-xl border-2 transition-all cursor-pointer bg-transparent ${
                  avatar === em ? 'border-gray-900 bg-gray-50' : 'border-transparent'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your name</div>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-gray-400"
          />
        </div>

        {/* Password */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Create a password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-gray-400 mb-2"
          />
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Confirm password"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-gray-400"
          />
        </div>

        {errorMsg && (
          <div className="text-sm text-red-500 font-medium">{errorMsg}</div>
        )}
      </div>

      <button
        onClick={handleJoin}
        disabled={!name.trim() || !password || !confirm || status === 'joining'}
        className="w-full py-3.5 rounded-2xl text-white font-bold text-base border-none cursor-pointer mt-6 disabled:opacity-40"
        style={{ background: '#111827' }}
      >
        {status === 'joining' ? 'Joining…' : 'Join Family Hub'}
      </button>
    </div>
  );
}
