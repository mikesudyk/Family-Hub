import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../api/client';
import { getColorClass } from '../data/calendar';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format a stored time string (HH:MM from sync, or "12:27 PM" from user events) for display
function formatTime(timeStr, use24h) {
  if (!timeStr || timeStr === 'All day') return timeStr || 'All day';

  // Display string already has AM/PM — convert to 24h if needed
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
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Format event time for display, combining start + end if available
function formatEventTime(event, use24h) {
  const t = event.time;
  if (!t || t === 'All day') return 'All day';
  // User-created events already embed "start–end" or just start in the time string
  if (/AM|PM/i.test(t)) return formatTime(t, use24h);
  // Synced events: t is "HH:MM", endTime may also be "HH:MM"
  const start = formatTime(t, use24h);
  if (event.endTime && event.endTime !== t) {
    return `${start}–${formatTime(event.endTime, use24h)}`;
  }
  return start;
}

function eventSortKey(event) {
  const t = event.time;
  if (!t || t === 'All day') return -1;
  const hhmm = t.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) return parseInt(hhmm[1]) * 60 + parseInt(hhmm[2]);
  const ampm = t.match(/^(\d+)(?::(\d+))?\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1]); const m = parseInt(ampm[2] || '0');
    if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return Infinity;
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

function dayLabel(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${DAY_LABELS[d.getDay()]}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

function AddEventForm({ onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(0);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');

  function handleSave() {
    const t = title.trim();
    if (!t) return;
    onSave({ title: t, date: date || today, time: formatTimeRange(startTime, duration), color: 'gray', icon: '📅', location: location.trim() || null, notes: notes.trim() || null, url: url.trim() || null });
  }

  return (
    <div className="bg-white rounded-xl px-4 py-3 space-y-2 mb-4">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">New Event</div>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder="Event title"
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none"
        />
        <input
          type="time"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none"
        />
      </div>
      <select
        value={duration}
        onChange={e => setDuration(Number(e.target.value))}
        disabled={!startTime}
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none cursor-pointer disabled:opacity-40"
      >
        {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
      <input
        value={location}
        onChange={e => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none resize-none"
      />
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="URL (optional)"
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none"
      />
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg border-none cursor-pointer"
        >Add Event</button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 bg-transparent border-none cursor-pointer px-3"
        >Cancel</button>
      </div>
    </div>
  );
}

function EventRow({ event, isUserEvent, onUpdate, onDelete, clock24h }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(0);
  const [location, setLocation] = useState(event.location || '');
  const [notes, setNotes] = useState(event.notes || '');
  const [url, setUrl] = useState(event.url || '');

  const hasInfo = event.notes || event.url || event.location;

  function handleSave() {
    onUpdate({
      title: title.trim() || event.title,
      date: date || event.date,
      time: formatTimeRange(startTime, duration) || event.time,
      location: location.trim() || null,
      notes: notes.trim() || null,
      url: url.trim() || null,
    });
    setEditing(false);
    setExpanded(false);
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl px-3 py-3 space-y-2">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none font-semibold"
        />
        <div className="flex gap-2">
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
            placeholder="Start time"
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
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none"
        />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none resize-none"
        />
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="URL (optional)"
          className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border-none outline-none"
        />
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
          <button onClick={onDelete} className="text-xs text-red-400 bg-transparent border-none cursor-pointer ml-auto">Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => isUserEvent ? setEditing(true) : hasInfo && setExpanded(v => !v)}
        className={`flex items-center gap-2.5 px-1 py-0.5 ${isUserEvent || hasInfo ? 'cursor-pointer' : ''}`}
      >
        <span className="text-sm leading-none">{event.icon}</span>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-sm font-semibold text-gray-900 truncate">{event.title}</span>
          {event.location && <span className="text-xs text-gray-400 truncate">{event.location}</span>}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getColorClass(event.color)}`}>
          {formatEventTime(event, clock24h)}
        </span>
        {isUserEvent && <span className="text-gray-300 text-xs">✏️</span>}
        {!isUserEvent && hasInfo && <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>}
      </div>
      {expanded && hasInfo && (
        <div className="px-1 pt-1 pb-0.5 space-y-1">
          {event.location && <p className="text-xs text-gray-500">📍 {event.location}</p>}
          {event.notes && <p className="text-xs text-gray-500 whitespace-pre-wrap">{event.notes}</p>}
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline break-all">
              {event.url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function CalendarScreen() {
  const { userCalendarEvents, addUserCalendarEvent, updateUserCalendarEvent, deleteUserCalendarEvent, calendarConnections, navigate, refresh, clock24h } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const hasConnections = calendarConnections.length > 0;

  async function handleSync() {
    setSyncing(true);
    try {
      await apiFetch('/api/calendar/sync', { method: 'POST' });
      await refresh();
    } finally {
      setSyncing(false);
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const userEventIds = new Set(userCalendarEvents.map(e => e.id));
  const allEvents = userCalendarEvents.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= today;
  });

  const grouped = {};
  allEvents.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  // Sort each day: all-day events first, then by start time ascending
  Object.values(grouped).forEach(evts => evts.sort((a, b) => eventSortKey(a) - eventSortKey(b)));
  const dates = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
        <div className="flex-1">
          <div className="text-xl font-extrabold tracking-tight">📅 Calendar</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {hasConnections ? 'Upcoming family events' : 'Connect a calendar to sync events'}
          </div>
        </div>
        {!hasConnections && (
          <button
            onClick={() => navigate('admin-calendars')}
            className="text-sm font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >
            Connect →
          </button>
        )}
        {hasConnections && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-sm font-semibold text-blue-500 bg-transparent border-none cursor-pointer disabled:opacity-40"
          >
            {syncing ? 'Syncing…' : '↻ Sync'}
          </button>
        )}
        <button
          onClick={() => setShowAdd(a => !a)}
          className="text-sm font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
        >
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-3">
        {/* Add form */}
        {showAdd && (
          <AddEventForm
            onSave={event => { addUserCalendarEvent(event); setShowAdd(false); }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {/* Event list */}
        {dates.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
            No upcoming events.
          </div>
        ) : (
          <div className="space-y-2">
            {dates.map(date => (
              <div key={date} className="bg-white rounded-xl px-4 py-2.5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                  {dayLabel(date)}
                </div>
                <div className="space-y-0.5">
                  {grouped[date].map(event => (
                    <EventRow
                      key={event.id}
                      event={event}
                      isUserEvent={userEventIds.has(event.id)}
                      onUpdate={changes => updateUserCalendarEvent(event.id, changes)}
                      onDelete={() => deleteUserCalendarEvent(event.id)}
                      clock24h={clock24h}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
