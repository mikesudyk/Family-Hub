import { useApp } from '../context/AppContext';

export const CHORE_EMOJIS = [
  { emoji: '✅', label: 'Check' },
  { emoji: '🧹', label: 'Broom' },
  { emoji: '🧺', label: 'Laundry' },
  { emoji: '🍽️', label: 'Dishes' },
  { emoji: '🚿', label: 'Bathroom' },
  { emoji: '🛁', label: 'Bathtub' },
  { emoji: '🪣', label: 'Bucket' },
  { emoji: '🧴', label: 'Soap' },
  { emoji: '🧻', label: 'Paper' },
  { emoji: '🗑️', label: 'Trash' },
  { emoji: '♻️', label: 'Recycle' },
  { emoji: '🛒', label: 'Shopping' },
  { emoji: '🍳', label: 'Cooking' },
  { emoji: '🥗', label: 'Salad' },
  { emoji: '🥪', label: 'Lunch' },
  { emoji: '🐕', label: 'Dog' },
  { emoji: '🐈', label: 'Cat' },
  { emoji: '🌱', label: 'Plants' },
  { emoji: '🌿', label: 'Yard' },
  { emoji: '📚', label: 'Books' },
  { emoji: '🎒', label: 'Backpack' },
  { emoji: '🛏️', label: 'Bed' },
  { emoji: '👕', label: 'Clothes' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '🪟', label: 'Windows' },
  { emoji: '🧽', label: 'Sponge' },
  { emoji: '🪴', label: 'Plant' },
  { emoji: '💧', label: 'Water' },
  { emoji: '🔧', label: 'Fix' },
  { emoji: '📦', label: 'Box' },
];

export function EmojiSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-gray-50 rounded-lg border-none outline-none text-base cursor-pointer ${className}`}
      style={{ padding: '6px 8px' }}
    >
      {CHORE_EMOJIS.map(({ emoji, label }) => (
        <option key={emoji} value={emoji}>{emoji} {label}</option>
      ))}
    </select>
  );
}

export function UncheckedCircle() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="#F5A624" strokeWidth="2.5" />
    </svg>
  );
}

const NAV_ITEMS = [
  { screen: 'hub',              label: 'Home',     icon: '🏠' },
  { screen: 'calendar',         label: 'Calendar', icon: '📅' },
  { screen: 'admin-dashboard',  label: 'Settings', icon: '⚙️' },
];

export function BottomNav() {
  const { screen, navigate } = useApp();
  const active = NAV_ITEMS.find(n => screen === n.screen || screen.startsWith(n.screen === 'admin-dashboard' ? 'admin' : n.screen)) || NAV_ITEMS[0];

  return (
    <div className="flex border-t border-gray-100 bg-white">
      {NAV_ITEMS.map(item => {
        const isActive = active.screen === item.screen;
        return (
          <button
            key={item.screen}
            onClick={() => navigate(item.screen)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 border-none bg-transparent cursor-pointer transition-colors
              ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className={`text-xs font-semibold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function BackButton({ to, data }) {
  const { navigate, goBack } = useApp();
  return (
    <button
      onClick={() => to ? navigate(to, data) : goBack()}
      className="text-2xl text-gray-600 pr-2 bg-transparent border-none cursor-pointer leading-none"
    >
      ←
    </button>
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3">
      {children}
    </div>
  );
}

export function SyncDot() {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      Synced
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 rounded-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function ProgressRing({ done, total, size = 48 }) {
  const pct = total === 0 ? 0 : done / total;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="#22c55e" strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={11} fontWeight="700" fill="#374151">
        {done}/{total}
      </text>
    </svg>
  );
}

export function AvatarRing({ member, size = 72 }) {
  const { doneCount, totalCount } = useApp();
  const isChild = member.role === 'child' && member.tier !== 'infant';
  const done  = isChild ? doneCount(member.id) : 0;
  const total = isChild ? totalCount(member.id) : 0;
  const pct   = total === 0 ? 0 : done / total;

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 7;
  const circ   = 2 * Math.PI * outerR;
  const offset = circ - pct * circ;

  return (
    <svg width={size} height={size}>
      {/* white bg */}
      <circle cx={cx} cy={cy} r={size / 2} fill="#F9F5F0" />
      {/* dotted track */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#d1d5db" strokeWidth={5}
        strokeDasharray="1 9" strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* green progress */}
      {isChild && total > 0 && pct > 0 && (
        <circle
          cx={cx} cy={cy} r={outerR}
          fill="none" stroke="#4A90E2" strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      {/* inner circle bg */}
      <circle cx={cx} cy={cy} r={innerR} fill="#F9F5F0" />
      {/* emoji */}
      <text
        x={cx} y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={innerR * 1.1}
      >
        {member.avatar}
      </text>
    </svg>
  );
}

export function GreenButton({ onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-green-500 text-white font-bold text-lg rounded-2xl py-4 cursor-pointer border-none mt-2 ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto bg-gray-900 text-white text-sm font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
    >
      {children}
    </button>
  );
}

export function MenuRow({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex justify-between items-center w-full py-3.5 border-none border-b border-gray-100 bg-transparent cursor-pointer text-base font-semibold text-gray-900"
      style={{ borderBottom: '1px solid #f3f4f6' }}
    >
      {children}
    </button>
  );
}

function getRepeatLabel(repeat) {
  if (!repeat || repeat === 'once') return null;
  if (repeat === 'daily') return 'Every day';
  if (Array.isArray(repeat)) return repeat.join(' · ');
  try { const a = JSON.parse(repeat); if (Array.isArray(a)) return a.join(' · '); } catch {}
  return null;
}

export function ChoreRow({ chore, onClick, dimmed = false }) {
  const repeatLabel = getRepeatLabel(chore.repeat);
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 py-3 w-full bg-transparent border-none cursor-pointer ${dimmed ? 'opacity-40' : ''}`}
      style={{ borderBottom: '1px solid #f3f4f6' }}
    >
      <div className="text-2xl w-9 text-center">{chore.icon}</div>
      <div className="flex-1 text-left">
        <div className={`font-semibold text-sm ${chore.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {chore.name}
        </div>
        {repeatLabel && !chore.done && (
          <div className="text-xs font-medium text-blue-500 mt-0.5">{repeatLabel}</div>
        )}
        {chore.done && (
          <div className="text-xs text-green-500">✓ Done</div>
        )}
      </div>
      <div className="text-xl">{dimmed ? null : chore.done ? '✅' : <UncheckedCircle />}</div>
    </button>
  );
}
