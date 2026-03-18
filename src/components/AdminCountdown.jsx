import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, GreenButton } from './ui';
import { FAMILY } from '../data/family';

function getNextBirthday(getMember) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const kids = FAMILY.filter(m => m.role === 'child');
  const upcoming = kids.map(k => {
    const m = getMember(k.id);
    if (!m.birthday) return null;
    const [, month, day] = m.birthday.split('-').map(Number);
    const thisYear = new Date(today.getFullYear(), month - 1, day);
    const nextBday = thisYear < today
      ? new Date(today.getFullYear() + 1, month - 1, day)
      : thisYear;
    return { name: `${m.name}'s Birthday`, date: nextBday.toISOString().split('T')[0], emoji: '🎂', member: m };
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] || null;
}

export default function AdminCountdown() {
  const { navigate, countdown, setCountdown, countdownMode, setCountdownMode, getMember } = useApp();
  const [name, setName]   = useState(countdown?.name || '');
  const [date, setDate]   = useState(countdown?.date || '');
  const [emoji, setEmoji] = useState(countdown?.emoji || '');
  const [saved, setSaved] = useState(false);

  const nextBirthday = getNextBirthday(getMember);

  function getDaysUntil(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d + 'T00:00:00');
    return Math.ceil((target - today) / 86400000);
  }

  function save() {
    if (!name.trim() || !date) return;
    setCountdown({ name: name.trim(), date, emoji: emoji.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const days = date && name ? getDaysUntil(date) : null;
  const previewEmoji = emoji.trim() || '🗓️';

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight">Featured Countdown</div>
      </div>

      {/* Mode toggle */}
      <div className="bg-white rounded-2xl p-4 mb-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Countdown Source</div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setCountdownMode('birthday')}
            className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left cursor-pointer bg-transparent transition-colors ${
              countdownMode === 'birthday' ? 'border-blue-400 bg-blue-50' : 'border-gray-100'
            }`}
          >
            <span className="text-xl mt-0.5">🎂</span>
            <div>
              <div className="text-sm font-semibold text-gray-800">Next Birthday</div>
              {nextBirthday ? (
                <div className="text-xs text-gray-500 mt-0.5">
                  {nextBirthday.name} · {getDaysUntil(nextBirthday.date)} days away
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-0.5">No birthdays set — add them in Manage Profiles</div>
              )}
            </div>
          </button>

          <button
            onClick={() => setCountdownMode('custom')}
            className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left cursor-pointer bg-transparent transition-colors ${
              countdownMode === 'custom' ? 'border-blue-400 bg-blue-50' : 'border-gray-100'
            }`}
          >
            <span className="text-xl mt-0.5">🗓️</span>
            <div>
              <div className="text-sm font-semibold text-gray-800">Custom Countdown</div>
              <div className="text-xs text-gray-500 mt-0.5">Set your own event name and date</div>
            </div>
          </button>
        </div>
      </div>

      {/* Custom countdown form — only shown when mode is custom */}
      {countdownMode === 'custom' && (
        <>
          <div className="text-sm text-gray-500 mb-5">
            Set one upcoming event to display as a countdown on the Family Hub.
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-700 mb-1.5">Event Name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Summer Vacation…"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base outline-none font-sans"
              />
            </div>
            <div className="w-20">
              <div className="text-xs font-bold text-gray-700 mb-1.5">Emoji</div>
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                placeholder="🗓️"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-2xl text-center outline-none font-sans"
                maxLength={2}
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs font-bold text-gray-700 mb-1.5">Event Date</div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base outline-none font-sans"
            />
          </div>

          {days !== null && (
            <div className="rounded-2xl p-4 mb-5 flex items-center gap-4 text-white" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
              <span className="text-4xl leading-none">{previewEmoji}</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-75">Preview</div>
                <div className="text-3xl font-black tracking-tight leading-none">{days} <span className="text-lg font-semibold">{days === 1 ? 'day' : 'days'}</span></div>
                <div className="text-sm font-semibold opacity-90">until {name}</div>
              </div>
            </div>
          )}

          <GreenButton onClick={save}>{saved ? '✓ Saved!' : 'Save Countdown'}</GreenButton>

          {countdown && (
            <button
              onClick={() => { setCountdown(null); setName(''); setDate(''); }}
              className="w-full mt-3 bg-transparent border-2 border-gray-200 rounded-2xl py-3 text-base font-semibold text-gray-500 cursor-pointer"
            >
              Remove Countdown
            </button>
          )}
        </>
      )}
    </div>
  );
}
