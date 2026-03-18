// Mock iCloud calendar events — replace with live ICS fetch later
// Dates are relative to today (2026-03-11)
function daysFromToday(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const CALENDAR_EVENTS = [
  { id: 1,  date: daysFromToday(0), time: '3:30 PM',  title: 'Elijah — Soccer Practice',    color: 'blue',   icon: '⚽' },
  { id: 2,  date: daysFromToday(0), time: '6:00 PM',  title: 'Family Dinner @ Grandma\'s',  color: 'orange', icon: '🍽️' },
  { id: 3,  date: daysFromToday(1), time: '9:00 AM',  title: 'Alyssandra — Piano Lesson',   color: 'purple', icon: '🎹' },
  { id: 4,  date: daysFromToday(1), time: '2:00 PM',  title: 'Emori — Dentist',             color: 'red',    icon: '🦷' },
  { id: 5,  date: daysFromToday(2), time: 'All day',  title: 'No School — Vacation',     color: 'green',  icon: '🏫' },
  { id: 6,  date: daysFromToday(2), time: '11:00 AM', title: 'Malachi — T-ball Game',       color: 'blue',   icon: '⚾' },
  { id: 7,  date: daysFromToday(3), time: '8:30 AM',  title: 'Dad — Work From Home',        color: 'gray',   icon: '💻' },
  { id: 8,  date: daysFromToday(3), time: '4:00 PM',  title: 'Elijah — Soccer Practice',    color: 'blue',   icon: '⚽' },
  { id: 9,  date: daysFromToday(4), time: '10:00 AM', title: 'Roman — Playdate (Jake\'s)',  color: 'yellow', icon: '🧒' },
  { id: 10, date: daysFromToday(5), time: 'All day',  title: 'Dad — Out of Town',           color: 'gray',   icon: '✈️' },
  { id: 11, date: daysFromToday(5), time: '1:00 PM',  title: 'Alyssandra — Art Club',       color: 'purple', icon: '🎨' },
  { id: 12, date: daysFromToday(6), time: '9:00 AM',  title: 'Family Grocery Run',          color: 'green',  icon: '🛒' },
  { id: 13, date: daysFromToday(6), time: '3:00 PM',  title: 'Emori — Birthday Party',      color: 'orange', icon: '🎂' },
];

const COLOR_MAP = {
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  red:    'bg-red-100 text-red-700',
  green:  'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  gray:   'bg-gray-100 text-gray-600',
};

export function getColorClass(color) {
  return COLOR_MAP[color] || COLOR_MAP.gray;
}
