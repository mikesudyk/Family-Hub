export const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Epoch: Mon Jan 6, 2025. Even weeks from this date are "active" biweekly weeks.
export function isBiweeklyActiveWeek(date = new Date()) {
  const EPOCH = new Date('2025-01-06').getTime();
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Math.round((monday.getTime() - EPOCH) / MS_PER_WEEK) % 2 === 0;
}

export function parseRepeat(repeat) {
  if (!repeat || repeat === 'once' || repeat === 'daily' || repeat === 'biweekly') return repeat;
  if (Array.isArray(repeat)) return repeat;
  if (typeof repeat === 'object') return repeat;
  try { const a = JSON.parse(repeat); if (Array.isArray(a) || (a && typeof a === 'object')) return a; } catch {}
  // PostgreSQL array formats: {"Mon","Wed"} or {Mon,Wed}
  const s = repeat.trim();
  const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
  return inner.split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

export function repeatLabel(repeat) {
  const r = parseRepeat(repeat);
  if (!r || r === 'once') return null;
  if (r === 'daily') return 'Every day';
  if (r === 'biweekly') return 'Every other week';
  if (r && typeof r === 'object' && r.biweekly) return `Every other week · ${r.biweekly.join(', ')}`;
  if (Array.isArray(r)) return r.join(' · ');
  return null;
}

export function choreAppliesOnDay(chore, dayAbbr, isToday, date) {
  const r = parseRepeat(chore.repeat);
  if (!r || r === 'once') return isToday;
  if (r === 'daily') return true;
  if (r === 'biweekly') return isBiweeklyActiveWeek(date);
  if (r && typeof r === 'object' && r.biweekly) {
    // r.even records which week parity the chore was created on; if absent, default to even (active) weeks
    const weekActive = r.even !== undefined ? isBiweeklyActiveWeek(date) === r.even : isBiweeklyActiveWeek(date);
    return weekActive && r.biweekly.includes(dayAbbr);
  }
  if (Array.isArray(r)) return r.includes(dayAbbr);
  return false;
}

export function appliesToday(chore) {
  const today = new Date();
  return choreAppliesOnDay(chore, DAY_ABBRS[today.getDay()], true, today);
}
