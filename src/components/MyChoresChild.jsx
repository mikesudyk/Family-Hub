import { useApp } from '../context/AppContext';
import { BackButton, UncheckedCircle } from './ui';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseRepeat(repeat) {
  if (!repeat || repeat === 'once' || repeat === 'daily') return repeat;
  if (Array.isArray(repeat)) return repeat;
  try { const a = JSON.parse(repeat); if (Array.isArray(a)) return a; } catch {}
  return repeat.split(',').map(s => s.trim()).filter(Boolean);
}

function appliesToday(chore) {
  const r = parseRepeat(chore.repeat);
  if (!r || r === 'once') return true;
  if (r === 'daily') return true;
  if (Array.isArray(r)) return r.includes(DAY_ABBRS[new Date().getDay()]);
  return true;
}

export default function MyChoresChild({ memberId }) {
  const { navigate, getMember, getChores, doneCount, toggleChore } = useApp();
  const member = getMember(memberId);
  if (!member) return null;

  const chores = getChores(member.id).filter(appliesToday);
  const done   = chores.filter(c => c.done).length;

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="hub" />
        <div className="text-xl font-extrabold tracking-tight">{member.avatar} My Chores!</div>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        ⭐ {done} of {chores.length} done — keep going!
      </div>

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
              const label = !r || r === 'once' ? null : r === 'daily' ? 'Every day' : Array.isArray(r) ? r.join(' · ') : null;
              return label ? <div className="text-xs font-medium text-blue-500 mb-1">{label}</div> : null;
            })()}
            <div className="text-2xl">{c.done ? '✅' : <UncheckedCircle />}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
