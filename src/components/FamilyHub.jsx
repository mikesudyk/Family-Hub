import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CALENDAR_EVENTS, getColorClass } from '../data/calendar';
import { AvatarRing, SectionLabel, SyncDot, UncheckedCircle } from './ui';

function formatDoneAt(doneAt) {
  if (!doneAt || doneAt === 'just now') return 'just now';
  const d = new Date(doneAt);
  if (isNaN(d)) return doneAt;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 12) return `${hrs}h ago`;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const VERSES = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Phil. 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Ps. 23:1" },
  { text: "Trust in the Lord with all your heart.", ref: "Prov. 3:5" },
  { text: "Be strong and courageous. Do not be afraid.", ref: "Josh. 1:9" },
  { text: "Love is patient, love is kind.", ref: "1 Cor. 13:4" },
  { text: "Give thanks to the Lord, for he is good.", ref: "Ps. 107:1" },
  { text: "Your word is a lamp to my feet and a light to my path.", ref: "Ps. 119:105" },
  { text: "For God so loved the world that he gave his one and only Son.", ref: "John 3:16" },
  { text: "Be still, and know that I am God.", ref: "Ps. 46:10" },
  { text: "The joy of the Lord is your strength.", ref: "Neh. 8:10" },
  { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Pet. 5:7" },
  { text: "With God all things are possible.", ref: "Matt. 19:26" },
  { text: "Let your light shine before others.", ref: "Matt. 5:16" },
  { text: "Do not grow weary in doing good.", ref: "Gal. 6:9" },
  { text: "He gives strength to the weary.", ref: "Isa. 40:29" },
  { text: "Rejoice in the Lord always.", ref: "Phil. 4:4" },
  { text: "The steadfast love of the Lord never ceases.", ref: "Lam. 3:22" },
  { text: "Seek first his kingdom and his righteousness.", ref: "Matt. 6:33" },
  { text: "My grace is sufficient for you.", ref: "2 Cor. 12:9" },
  { text: "Children are a heritage from the Lord.", ref: "Ps. 127:3" },
  { text: "Train up a child in the way he should go.", ref: "Prov. 22:6" },
  { text: "As for me and my house, we will serve the Lord.", ref: "Josh. 24:15" },
  { text: "Do everything in love.", ref: "1 Cor. 16:14" },
  { text: "He who began a good work in you will carry it on to completion.", ref: "Phil. 1:6" },
  { text: "The Lord bless you and keep you.", ref: "Num. 6:24" },
  { text: "Give, and it will be given to you.", ref: "Luke 6:38" },
  { text: "Blessed are the peacemakers.", ref: "Matt. 5:9" },
  { text: "Pray without ceasing.", ref: "1 Thess. 5:17" },
  { text: "In all your ways acknowledge him, and he will make your paths straight.", ref: "Prov. 3:6" },
  { text: "The name of the Lord is a fortified tower.", ref: "Prov. 18:10" },
  { text: "God is our refuge and strength.", ref: "Ps. 46:1" },
];

function getDailyVerse() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day = Math.floor((new Date() - start) / 86400000);
  return VERSES[day % VERSES.length];
}

function BibleVerseCompact() {
  const verse = getDailyVerse();
  return (
    <div className="min-w-0 text-center">
      <p className="text-xs italic text-gray-600 leading-snug line-clamp-2">"{verse.text}"</p>
      <p className="text-xs font-semibold text-gray-400 mt-0.5">{verse.ref}</p>
    </div>
  );
}

function BibleVerseCard() {
  const verse = getDailyVerse();
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 mb-4 text-center">
      <p className="text-xs italic text-gray-600 leading-snug">"{verse.text}"</p>
      <p className="text-xs font-semibold text-gray-400 mt-0.5">{verse.ref}</p>
    </div>
  );
}

function CountdownChip({ countdown }) {
  if (!countdown?.name || !countdown?.date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(countdown.date + 'T00:00:00');
  const days = Math.ceil((target - today) / 86400000);
  return (
    <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-white" style={{ background: '#4FA45A' }}>
      <div className="flex flex-col items-center">
        <div className="text-2xl font-black leading-none">{days}</div>
        <div className="text-xs font-semibold leading-none mt-0.5">days</div>
      </div>
      <div className="text-xs opacity-90 max-w-[80px]">{countdown.name}</div>
    </div>
  );
}

function FamilyCard({ member }) {
  const { navigate, getTier } = useApp();
  const tier = getTier(member);
  const isInfant = tier === 'infant';

  if (isInfant) {
    return (
      <div className="flex flex-col items-center opacity-60 cursor-default p-1">
        <AvatarRing member={member} size={68} />
        <div className="text-xs font-bold mt-1.5 text-center text-gray-900">{member.name}</div>
        <div className="text-xs text-gray-400 text-center">Too young</div>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('child-profile', member.id)}
      className="flex flex-col items-center bg-transparent border-none cursor-pointer p-1"
    >
      <AvatarRing member={member} size={68} />
      <div className="text-xs font-bold mt-1.5 text-center text-gray-900">{member.name}</div>
      {member.role === 'admin' && (
        <div className="text-xs text-gray-400 text-center">Admin</div>
      )}
    </button>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return DAY_LABELS[d.getDay()];
}

const DURATIONS = [
  { label: 'No end time', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
  { label: '4 hr', value: 240 },
];

function formatTimeRange(startTime, durationMins) {
  if (!startTime) return 'All day';
  const [h, m] = startTime.split(':').map(Number);
  function fmt(totalMins) {
    const hh = Math.floor(totalMins / 60) % 24;
    const mm = totalMins % 60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 || 12;
    return mm === 0 ? `${h12} ${ampm}` : `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
  }
  const startMins = h * 60 + m;
  if (!durationMins) return fmt(startMins);
  return `${fmt(startMins)}–${fmt(startMins + durationMins)}`;
}

function formatDisplayTime(timeStr, use24h) {
  if (!timeStr || timeStr === 'All day') return 'All day';
  // Already has AM/PM (user-created events)
  if (/AM|PM/i.test(timeStr)) {
    if (!use24h) return timeStr;
    return timeStr.split('–').map(part => {
      const m = part.trim().match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
      if (!m) return part.trim();
      let h = parseInt(m[1]); const min = parseInt(m[2] || '0');
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      return `${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
    }).join('–');
  }
  // Raw HH:MM from sync
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return timeStr;
  if (use24h) return timeStr;
  const h = parseInt(match[1]); const m = parseInt(match[2]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function WeekCalendar() {
  const { userCalendarEvents, addUserCalendarEvent, calendarConnections, navigate, clock24h } = useApp();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(0);

  const hasConnections = calendarConnections.length > 0;

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const in7 = new Date(todayDate); in7.setDate(todayDate.getDate() + 7);
  const todayStr = todayDate.toISOString().split('T')[0];

  const sourceEvents = hasConnections ? userCalendarEvents : [...CALENDAR_EVENTS, ...userCalendarEvents];
  const allEvents = sourceEvents.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= todayDate && d < in7;
  });

  const grouped = {};
  allEvents.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  const dates = Object.keys(grouped).sort();

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    addUserCalendarEvent({ date: date || todayStr, title: t, time: formatTimeRange(startTime, duration), color: 'gray', icon: '📅' });
    setTitle('');
    setDate('');
    setStartTime('');
    setDuration(0);
    setAdding(false);
  }

  return (
    <div className="bg-white rounded-xl px-4 py-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upcoming</div>
          {!hasConnections && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md">Sample</span>
          )}
        </div>
        {hasConnections ? (
          <button
            onClick={() => setAdding(a => !a)}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >
            {adding ? 'Cancel' : '+ Add'}
          </button>
        ) : (
          <button
            onClick={() => navigate('admin-calendars')}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >
            Connect →
          </button>
        )}
      </div>

      {/* Add form (only when connected) */}
      {adding && hasConnections && (
        <div className="mb-3 space-y-1.5">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Event title"
            className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none"
          />
          <div className="flex gap-1.5">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none"
            />
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none"
            />
          </div>
          <select
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            disabled={!startTime}
            className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none cursor-pointer disabled:opacity-40"
          >
            {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button
            onClick={handleAdd}
            className="w-full bg-gray-900 text-white text-xs font-semibold py-2 rounded-lg border-none cursor-pointer"
          >
            Add Event
          </button>
        </div>
      )}

      {/* Events */}
      <div className={!hasConnections ? 'opacity-60' : ''}>
        {dates.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-1">Nothing scheduled this week.</div>
        ) : (
          <div className="space-y-3">
            {dates.map((date, i) => (
              <div key={date}>
                {i > 0 && <div className="h-px bg-gray-100 -mx-4 mb-3" />}
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{dayLabel(date)}</div>
                <div className="space-y-1">
                  {grouped[date].map(event => (
                    <div key={event.id} className="flex items-center gap-2.5">
                      <span className="text-sm text-gray-800 truncate flex-1">{event.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getColorClass(event.color)}`}>{formatDisplayTime(event.time, clock24h)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect CTA when using sample data */}
      {!hasConnections && (
        <button
          onClick={() => navigate('admin-calendars')}
          className="w-full mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 hover:text-blue-500 bg-transparent border-b-0 border-l-0 border-r-0 cursor-pointer text-center font-semibold transition-colors"
        >
          Connect your calendar to see real events →
        </button>
      )}
    </div>
  );
}

function ActiveListCard() {
  const { activeListEvent, getListEventProgress, dismissListEvent, chores } = useApp();
  const [expanded, setExpanded] = useState(false);
  if (!activeListEvent) return null;

  const { total, done } = getListEventProgress(activeListEvent.id);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;

  const { getAllMembers: getAll } = useApp();
  const eventChores = getAll()
    .filter(m => m.role === 'child')
    .flatMap(kid =>
      (chores[kid.id] || [])
        .filter(c => c.listEventId === activeListEvent.id)
        .map(c => ({ ...c, kid }))
    );

  return (
    <div className={`rounded-2xl mb-5 overflow-hidden ${complete ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-100'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 bg-transparent border-none cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{complete ? '🎉' : '📋'}</span>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">{activeListEvent.name}</div>
            <div className={`text-xs font-semibold ${complete ? 'text-green-600' : 'text-blue-600'}`}>
              {complete ? 'All done!' : `${done} of ${total} chores done`}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {complete && (
              <button
                onClick={e => { e.stopPropagation(); dismissListEvent(); }}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
              >
                ×
              </button>
            )}
            <span className={`text-gray-400 text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
          </div>
        </div>
        <div className="w-full bg-white rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${complete ? 'bg-green-400' : 'bg-blue-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!complete && (
          <div className={`text-xs mt-1.5 text-right ${complete ? 'text-green-500' : 'text-blue-500'}`}>{pct}% complete</div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          <div className="w-full h-px bg-blue-100 mb-3" />
          {eventChores.map(c => (
            <div key={c.id} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2">
              <span className="text-base">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${c.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{c.name}</div>
                <div className="text-xs text-gray-400">{c.kid.avatar} {c.kid.name}</div>
              </div>
              <span className={`text-base ${c.done ? 'text-green-500' : 'text-gray-200'}`}>{c.done ? '✅' : <UncheckedCircle />}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



function timeAgo(isoStr) {
  if (!isoStr) return '';
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function FamilyGoalsSection() {
  const { familyGoals, toggleFamilyGoal, addFamilyGoal, removeFamilyGoal, updateFamilyGoal } = useApp();
  const [newGoalText, setNewGoalText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const active  = familyGoals.active  || [];
  const history = familyGoals.history || [];

  function handleAdd() {
    const text = newGoalText.trim();
    if (!text) return;
    addFamilyGoal(text);
    setNewGoalText('');
  }

  function startEdit(g) {
    setEditingId(g.id);
    setEditText(g.text);
  }

  function saveEdit(id) {
    const text = editText.trim();
    if (text) updateFamilyGoal(id, text);
    setEditingId(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 mt-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Family Goals</div>
        <div className="flex-1" />
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs font-semibold text-brand bg-transparent border-none cursor-pointer"
          >
            {showHistory ? 'Hide history' : 'History'}
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm mb-2.5">
          No active goals.
        </div>
      ) : (
        active.map(g => (
          <div key={g.id} className="bg-white rounded-xl mb-2 flex items-center gap-3 px-3.5 py-3">
            <button
              onClick={() => toggleFamilyGoal(g.id)}
              className="text-gray-300 bg-transparent border-none cursor-pointer p-0 flex-shrink-0 text-lg leading-none"
            >
              <UncheckedCircle />
            </button>
            {editingId === g.id ? (
              <input
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(g.id); if (e.key === 'Escape') setEditingId(null); }}
                onBlur={() => saveEdit(g.id)}
                className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-none outline-none"
              />
            ) : (
              <span
                onClick={() => startEdit(g)}
                className="flex-1 text-sm font-semibold text-gray-900 cursor-text"
              >
                {g.text}
              </span>
            )}
            <button
              onClick={() => removeFamilyGoal(g.id)}
              className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
            >×</button>
          </div>
        ))
      )}

      <div className="flex items-center gap-2 mt-1 mb-2">
        <input
          value={newGoalText}
          onChange={e => setNewGoalText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a goal…"
          className="flex-1 bg-white rounded-xl px-3.5 py-2.5 text-sm border-none outline-none"
        />
        {newGoalText.trim() && (
          <button
            onClick={handleAdd}
            className="text-xs font-semibold bg-brand text-white px-3 py-2.5 rounded-xl border-none cursor-pointer"
          >Add</button>
        )}
      </div>

      {showHistory && (
        <div className="mt-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Completed (last 30 days)</div>
          {history.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">No completed goals yet.</div>
          ) : (
            history.map(g => (
              <div key={g.id} className="bg-white rounded-xl mb-2 flex items-center gap-3 px-3.5 py-3 opacity-60">
                <button
                  onClick={() => toggleFamilyGoal(g.id)}
                  className="text-green-500 bg-transparent border-none cursor-pointer p-0 flex-shrink-0 text-lg leading-none"
                  title="Mark incomplete"
                >✅</button>
                <span className="flex-1 text-sm font-semibold text-gray-500 line-through">{g.text}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(g.completedAt)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function getNextBirthday(getMember, allMembers) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const kids = allMembers.filter(m => m.role === 'child');
  const upcoming = kids.map(k => {
    const m = getMember(k.id);
    if (!m.birthday) return null;
    const [, month, day] = m.birthday.split('-').map(Number);
    const thisYear = new Date(today.getFullYear(), month - 1, day);
    const nextBday = thisYear < today
      ? new Date(today.getFullYear() + 1, month - 1, day)
      : thisYear;
    return { name: `${m.name}'s Birthday`, date: nextBday.toISOString().split('T')[0], emoji: '🎂' };
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] || null;
}

export default function FamilyHub() {
  const { navigate, countdown, countdownMode, getChores, doneCount, totalCount, hubName, setShowDailyOverview, getMember, getAllMembers } = useApp();
  const allMembers = getAllMembers().slice().sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    if (a.role === 'child' && b.role === 'child') {
      if (a.birthday && b.birthday) return a.birthday.localeCompare(b.birthday);
      if (a.birthday) return -1;
      if (b.birthday) return 1;
    }
    return 0;
  });

  const effectiveCountdown = countdownMode === 'birthday' ? getNextBirthday(getMember, allMembers) : countdown;

  const activity = allMembers
    .filter(m => m.role === 'child')
    .flatMap(k => getChores(k.id).filter(c => c.done).map(c => ({ ...c, kid: getMember(k.id) })));

  return (
    <div className="p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="shrink-0">
          <div className="text-xl font-extrabold tracking-tight">🏠 {hubName}</div>
          <SyncDot />
        </div>
        {/* Bible verse — center of header on iPad only */}
        <div className="hidden md:block flex-1 min-w-0">
          <BibleVerseCompact />
        </div>
        <CountdownChip countdown={effectiveCountdown} />
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6">
        {/* Left column */}
        <div>
          {/* Active List Event */}
          <ActiveListCard />

          {/* Bible verse — card above family on mobile only */}
          <div className="md:hidden">
            <BibleVerseCard />
          </div>

          {/* Family Members */}
          <div className="flex items-center justify-between mb-2 mt-3 md:mt-0">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Family</div>
            <button
              onClick={() => setShowDailyOverview(true)}
              className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
            >
              Overview
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {allMembers.map(m => <FamilyCard key={m.id} member={m} />)}
          </div>

          {/* Family Goals — below avatars on all screen sizes */}
          <FamilyGoalsSection />
        </div>

        {/* Right column */}
        <div>
          {/* Week Calendar */}
          <WeekCalendar />

          {/* Today's Activity */}
          <SectionLabel>Today's Activity</SectionLabel>
          {activity.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">
              No activity yet today.
            </div>
          ) : (
            activity.map((c, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <div className="text-xl">{c.icon}</div>
                <div>
                  <div className="text-sm font-semibold">{c.kid.name} completed "{c.name}"</div>
                  <div className="text-xs text-gray-400">{formatDoneAt(c.doneAt)}</div>
                </div>
                <div className="ml-auto text-green-500 text-base">✓</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
