import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CALENDAR_EVENTS, getColorClass } from '../data/calendar';
import { AvatarRing, SectionLabel, SyncDot, UncheckedCircle } from './ui';

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

function WeekCalendar() {
  const { userCalendarEvents, addUserCalendarEvent } = useApp();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(0);

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const in7 = new Date(todayDate); in7.setDate(todayDate.getDate() + 7);
  const todayStr = todayDate.toISOString().split('T')[0];

  const allEvents = [...CALENDAR_EVENTS, ...userCalendarEvents].filter(e => {
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
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upcoming</div>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
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
                    <span className="text-base leading-none w-5 text-center">{event.icon}</span>
                    <span className="text-sm text-gray-800 truncate flex-1">{event.title}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getColorClass(event.color)}`}>{event.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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


function formatPastDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function FamilyGoalsSection() {
  const { familyGoals, toggleFamilyGoal, addFamilyGoal, removeFamilyGoal, updateFamilyGoal } = useApp();
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const todayGoals = familyGoals[today] || [];
  const pastDates = Object.keys(familyGoals).filter(d => d < today).sort().reverse();

  function handleAdd() {
    const text = newGoalText.trim();
    if (!text) return;
    addFamilyGoal(today, text);
    setNewGoalText('');
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 mt-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Family Goals</div>
        <button
          onClick={() => { setEditing(e => !e); setShowHistory(false); setNewGoalText(''); }}
          className="bg-transparent border-none cursor-pointer p-0 leading-none"
          style={{ color: editing ? '#4FA45A' : '#9ca3af' }}
          title={editing ? 'Done editing' : 'Edit goals'}
        >
          {editing ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )}
        </button>
        <div className="flex-1" />
        {pastDates.length > 0 && !editing && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >
            {showHistory ? 'Hide History' : 'History'}
          </button>
        )}
      </div>

      {/* Today's goals */}
      {todayGoals.length === 0 && !editing ? (
        <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm mb-2.5">
          No goals for today.
        </div>
      ) : (
        todayGoals.map(g => (
          <div key={g.id} className="bg-white rounded-xl mb-2 flex items-center gap-3 px-3.5 py-3">
            {editing ? (
              <>
                <input
                  value={g.text}
                  onChange={e => updateFamilyGoal(today, g.id, e.target.value)}
                  className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-none outline-none"
                />
                <button
                  onClick={() => removeFamilyGoal(today, g.id)}
                  className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none"
                >×</button>
              </>
            ) : (
              <button
                onClick={() => toggleFamilyGoal(today, g.id)}
                className="w-full flex items-center gap-3 bg-transparent border-none cursor-pointer text-left"
              >
                <span className={`text-lg leading-none ${g.done ? 'text-green-500' : 'text-gray-300'}`}>
                  {g.done ? '✅' : <UncheckedCircle />}
                </span>
                <span className={`text-sm font-semibold ${g.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {g.text}
                </span>
              </button>
            )}
          </div>
        ))
      )}

      {/* Add new goal (edit mode) */}
      {editing && (
        <div className="flex items-center gap-2 mb-2">
          <input
            autoFocus={todayGoals.length === 0}
            value={newGoalText}
            onChange={e => setNewGoalText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a goal…"
            className="flex-1 bg-white rounded-xl px-3.5 py-3 text-sm border-none outline-none"
          />
          <button
            onClick={handleAdd}
            className="text-xs font-semibold bg-gray-900 text-white px-3 py-2.5 rounded-xl border-none cursor-pointer"
          >Add</button>
        </div>
      )}

      {/* History (read-only) */}
      {showHistory && pastDates.map(date => (
        <div key={date} className="mb-3 mt-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 mt-2">
            {formatPastDate(date)}
          </div>
          {(familyGoals[date] || []).map(g => (
            <div key={g.id} className="flex items-center gap-3 bg-white rounded-xl p-3.5 mb-1.5 opacity-70">
              <span className={`text-lg leading-none ${g.done ? 'text-green-500' : 'text-gray-300'}`}>
                {g.done ? '✅' : <UncheckedCircle />}
              </span>
              <span className={`text-sm ${g.done ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                {g.text}
              </span>
            </div>
          ))}
        </div>
      ))}
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
                  <div className="text-xs text-gray-400">{c.doneAt}</div>
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
