import { useState } from 'react';
import { useApp } from '../context/AppContext';

const GREEN = '#4FA45A';
const DARK  = '#111827';

function Logo() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md" style={{ background: GREEN }}>
        <span className="text-3xl">🏠</span>
      </div>
      <div className="text-4xl font-black tracking-tighter leading-none">
        <span className="text-gray-900">aera</span><span style={{ color: GREEN }}>mea</span>
      </div>
      <div className="text-xs font-semibold tracking-[0.25em] uppercase text-gray-400 mt-1.5">
        family hub
      </div>
    </div>
  );
}

function SignInForm({ onBack }) {
  const { signIn } = useApp();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-400 bg-transparent border-none cursor-pointer mb-8 self-start"
      >
        ← Back
      </button>
      <div className="text-2xl font-extrabold tracking-tight mb-1">Welcome back</div>
      <div className="text-sm text-gray-400 mb-6">Sign in to your family hub</div>

      <div className="space-y-3 mb-5">
        <input
          autoFocus
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Password"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        {error && <div className="text-xs text-red-500 px-1">{error}</div>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !email.trim() || !password}
        className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white mb-3 disabled:opacity-50"
        style={{ background: GREEN }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <button className="text-xs text-gray-400 text-center bg-transparent border-none cursor-pointer">
        Forgot password?
      </button>
    </div>
  );
}

function SignUpForm({ onBack, onSuccess }) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');

  function handleSubmit() {
    if (!firstName.trim() || !email.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError('');
    onSuccess({ name: firstName.trim(), email: email.trim(), password });
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-400 bg-transparent border-none cursor-pointer mb-8 self-start"
      >
        ← Back
      </button>
      <div className="text-2xl font-extrabold tracking-tight mb-1">Create account</div>
      <div className="text-sm text-gray-400 mb-6">Let's get your family set up</div>

      <div className="space-y-3 mb-4">
        <input
          autoFocus
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder="Your first name"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Confirm password"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        {error && <div className="text-xs text-red-500 px-1">{error}</div>}
      </div>

      <button
        onClick={handleSubmit}
        className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white"
        style={{ background: DARK }}
      >
        Continue →
      </button>
    </div>
  );
}

export default function WelcomeScreen() {
  const { startOnboarding } = useApp();
  const [view, setView] = useState('welcome'); // 'welcome' | 'sign-in' | 'sign-up'

  if (view === 'sign-in') {
    return (
      <div className="p-6 flex flex-col h-full">
        <SignInForm onBack={() => setView('welcome')} />
      </div>
    );
  }

  if (view === 'sign-up') {
    return (
      <div className="p-6 overflow-y-auto">
        <SignUpForm onBack={() => setView('welcome')} onSuccess={startOnboarding} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <Logo />
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 leading-snug">Your whole family,<br />in one place.</div>
          <div className="text-sm text-gray-400 mt-2 leading-relaxed">
            Chores, meals, goals, calendars —<br />designed for how real families work.
          </div>
        </div>
      </div>

      <div className="space-y-3 pb-2">
        <button
          onClick={() => setView('sign-up')}
          className="w-full font-bold py-4 rounded-2xl text-sm border-none cursor-pointer text-white"
          style={{ background: DARK }}
        >
          Get Started
        </button>
        <button
          onClick={() => setView('sign-in')}
          className="w-full text-sm font-medium text-gray-500 bg-transparent border-none cursor-pointer py-2"
        >
          Already have an account?{' '}
          <span className="font-bold text-gray-900">Sign In</span>
        </button>
      </div>
    </div>
  );
}
