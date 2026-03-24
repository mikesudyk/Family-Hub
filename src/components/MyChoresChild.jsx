import { useApp } from '../context/AppContext';
import { BackButton, UncheckedCircle } from './ui';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseRepeat(repeat) {
  if (!repeat || repeat === 'once' || repeat === 'daily' || repeat === 'biweekly') return repeat;
  if (Array.isArray(repeat)) return repeat;
  try { const a = JSON.parse(repeat); if (Array.isArray(a)) return a; } catch {}
  // PostgreSQL array formats: {"Mon","Wed"} or {Mon,Wed}
  const s = repeat.trim();
  const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
  return inner.split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

function isBiweeklyActiveWeek(date = new Date()) {
  const EPOCH = new Date('2025-01-06').getTime();
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Math.round((monday.getTime() - EPOCH) / MS_PER_WEEK) % 2 === 0;
}

function appliesToday(chore) {
  const r = parseRepeat(chore.repeat);
  if (!r || r === 'once') return true;
  if (r === 'daily') return true;
  if (r === 'biweekly') return isBiweeklyActiveWeek();
  if (Array.isArray(r)) return r.includes(DAY_ABBRS[new Date().getDay()]);
  return true;
}

export default function MyChoresChild({ memberId }) {
  const { navigate, getMember, getChores, doneCount, toggleChore } = useApp();
  const member = getMember(memberId);
  if (!member) return null;

  const allChores   = getChores(member.id);
  const chores      = allChores.filter(appliesToday);
  const otherChores = allChores.filter(c => !appliesToday(c));
  const done        = chores.filter(c => c.done).length;

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="hub" />
        <div className="text-xl font-extrabold tracking-tight">{member.avatar} My Chores!</div>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        ⭐ {done} of {chores.length} done — keep going!
      </div>

      {chores.length === 0 && (
        <div className="bg-white rounded-2xl p-4 text-center text-gray-400 text-sm mb-4">
          No chores today! 🎉
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {chores.map(c => (
          <button
            key={c.id}
            onClick={() => toggleChore(member.id, c.id)}
            className={`flex flex-col items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              c.done
                ? 'bg-green-50 border-green-500'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="text-4xl mb-2">{c.icon}</div>
            <div className="font-bold text-sm mb-1 text-center">{c.name}</div>
            {(() => {
              const r = parseRepeat(c.repeat);
              const label = !r || r === 'once' ? null : r === 'daily' ? 'Every day' : r === 'biweekly' ? 'Every other week' : Array.isArray(r) ? r.join(' · ') : null;
              return label ? <div className="text-xs font-medium text-blue-500 mb-1">{label}</div> : null;
            })()}
            <div className="text-2xl">{c.done ? '✅' : <UncheckedCircle />}</div>
          </button>
        ))}
      </div>

      {otherChores.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Scheduled other days</div>
          <div className="space-y-1">
            {otherChores.map(c => {
              const r = parseRepeat(c.repeat);
              const label = !r || r === 'once' ? null : r === 'daily' ? 'Every day' : r === 'biweekly' ? 'Every other week' : Array.isArray(r) ? r.join(' · ') : null;
              return (
                <div key={c.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 opacity-50">
                  <span className="text-base">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{c.name}</div>
                    {label && <div className="text-xs text-blue-500">{label}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
