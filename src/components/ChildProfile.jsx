import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, SectionLabel, ProgressRing, ChoreRow, AvatarRing, UncheckedCircle } from './ui';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekDays() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Start from Sunday of this week
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function parseRepeat(repeat) {
  if (!repeat || repeat === 'once' || repeat === 'daily') return repeat;
  if (Array.isArray(repeat)) return repeat;
  try { const a = JSON.parse(repeat); if (Array.isArray(a)) return a; } catch {}
  // PostgreSQL array formats: {"Mon","Wed"} or {Mon,Wed}
  const s = repeat.trim();
  const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
  return inner.split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

function repeatLabel(repeat) {
  const r = parseRepeat(repeat);
  if (!r || r === 'once') return null;
  if (r === 'daily') return 'Every day';
  if (Array.isArray(r)) return r.join(' · ');
  return null;
}

function choreAppliesOnDay(chore, dayAbbr, isToday) {
  const r = parseRepeat(chore.repeat);
  if (!r || r === 'once') return isToday;
  if (r === 'daily') return true;
  if (Array.isArray(r)) return r.includes(dayAbbr);
  return false;
}

function appliesToday(chore) {
  return choreAppliesOnDay(chore, DAY_ABBRS[new Date().getDay()], true);
}

function WeekView({ chores }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = getWeekDays();
  const [showHistory, setShowHistory] = useState(false);

  const hasPastDays = days.some(d => d < today);
  const visibleDays = showHistory ? days : days.filter(d => d >= today);

  return (
    <div className="space-y-2">
      {hasPastDays && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >
            {showHistory ? 'Hide history' : 'History'}
          </button>
        </div>
      )}
      {visibleDays.map(day => {
        const abbr = DAY_ABBRS[day.getDay()];
        const isToday = day.getTime() === today.getTime();
        const isPast  = day < today;
        const dayChores = chores.filter(c => choreAppliesOnDay(c, abbr, isToday));

        return (
          <div
            key={abbr}
            className={`bg-white rounded-xl px-4 py-3 ${isPast ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-extrabold uppercase tracking-wide ${isToday ? 'text-green-600' : 'text-gray-400'}`}>
                {isToday ? 'Today' : abbr}
              </span>
              <span className="text-xs text-gray-300">
                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {dayChores.length > 0 && (
                <span className="ml-auto text-xs text-gray-400">{dayChores.length} chore{dayChores.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {dayChores.length === 0 ? (
              <div className="text-xs text-gray-300">No chores</div>
            ) : (
              <div className="space-y-1">
                {dayChores.map(c => {
                  const label = repeatLabel(c.repeat);
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${isToday && c.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {c.name}
                        </span>
                        {label && (
                          <div className="text-xs font-medium text-blue-500">{label}</div>
                        )}
                      </div>
                      {isToday && (
                        <span className="text-sm flex-shrink-0">{c.done ? '✅' : <UncheckedCircle />}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ChildProfile({ memberId }) {
  const { navigate, getMember, getTier, getChores, doneCount, totalCount, getGoals, toggleGoal,
          getPersonalTodos, addPersonalTodo, removePersonalTodo, togglePersonalTodo } = useApp();
  const [weekView, setWeekView] = useState(false);
  const [addingTodo, setAddingTodo] = useState(false);
  const [todoText, setTodoText] = useState('');
  const member = getMember(memberId);
  if (!member) return null;

  const tier      = getTier(member);
  const chores    = getChores(member.id);
  const todayChores = chores.filter(appliesToday);
  const done      = doneCount(member.id);
  const total     = totalCount(member.id);

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <BackButton to="hub" />
        <button
          onClick={() => navigate('print-view', member.id)}
          className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm cursor-pointer"
        >
          🖨️ Print
        </button>
      </div>

      {/* Avatar with progress ring */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <AvatarRing member={member} size={76} />
        <div>
          <div className="text-lg font-extrabold">{member.name}</div>
          <div className="text-xs text-gray-400">Age {member.age} · {tier}</div>
          <div className="text-sm font-semibold mt-1" style={{ color: '#4A90E2' }}>
            {total === 0 ? 'No chores today' : total - done === 0 ? '🎉 All done!' : `${done} of ${total} done today`}
          </div>
        </div>
      </div>

      {/* Today / This Week toggle */}
      <div className="flex gap-2 mb-3">
        {['Today', 'This Week'].map((label, i) => (
          <button
            key={label}
            onClick={() => setWeekView(i === 1)}
            className={`px-4 py-2 rounded-lg border-none cursor-pointer font-semibold text-sm ${
              weekView === (i === 1)
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chore list */}
      {weekView ? (
        <WeekView chores={chores} />
      ) : (
        todayChores.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">No chores today.</div>
        ) : (
          todayChores.map(c => (
            <ChoreRow
              key={c.id}
              chore={c}
              onClick={() => navigate('chore-detail', { choreId: c.id, memberId: member.id })}
            />
          ))
        )
      )}

      {/* School Goals */}
      <SectionLabel>School Goals</SectionLabel>
      {getGoals(member.id).length === 0 ? (
        <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">
          No school goals yet.
        </div>
      ) : (
        <div className="space-y-2">
          {getGoals(member.id).map(goal => (
            <button
              key={goal.id}
              onClick={() => toggleGoal(member.id, goal.id)}
              className="w-full flex items-center gap-3 bg-white rounded-xl px-3 py-3 border-none cursor-pointer text-left"
            >
              <span className="text-lg w-7 text-center">{goal.done ? '✅' : '🎯'}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${goal.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {goal.text}
                </div>
                {goal.dueDate && !goal.done && (
                  <div className="text-xs text-gray-400">
                    Due {new Date(goal.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Personal To-Dos */}
      <SectionLabel>My To-Dos</SectionLabel>
      {(() => {
        const todos = getPersonalTodos(member.id);
        const active = todos.filter(t => !t.done);
        const done   = todos.filter(t => t.done);
        return (
          <>
            {todos.length === 0 && !addingTodo && (
              <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm mb-2">
                No to-dos yet. Add one below!
              </div>
            )}
            {active.length > 0 && (
              <div className="space-y-2 mb-2">
                {active.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-3">
                    <button
                      onClick={() => togglePersonalTodo(member.id, todo.id)}
                      className="text-lg w-6 text-center bg-transparent border-none cursor-pointer p-0 flex-shrink-0"
                    >
                      <UncheckedCircle />
                    </button>
                    <div className="flex-1 text-sm text-gray-800">{todo.text}</div>
                    <button
                      onClick={() => removePersonalTodo(member.id, todo.id)}
                      className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-2 mb-2">
                {done.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-3 opacity-50">
                    <button
                      onClick={() => togglePersonalTodo(member.id, todo.id)}
                      className="text-lg w-6 text-center bg-transparent border-none cursor-pointer p-0 flex-shrink-0"
                    >
                      ✅
                    </button>
                    <div className="flex-1 text-sm line-through text-gray-400">{todo.text}</div>
                    <button
                      onClick={() => removePersonalTodo(member.id, todo.id)}
                      className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            {addingTodo ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  value={todoText}
                  onChange={e => setTodoText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && todoText.trim()) {
                      addPersonalTodo(member.id, todoText.trim());
                      setTodoText('');
                      setAddingTodo(false);
                    }
                    if (e.key === 'Escape') { setAddingTodo(false); setTodoText(''); }
                  }}
                  placeholder="What do you need to do?"
                  className="flex-1 bg-white rounded-xl px-3 py-2.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    if (todoText.trim()) addPersonalTodo(member.id, todoText.trim());
                    setTodoText('');
                    setAddingTodo(false);
                  }}
                  className="text-sm font-semibold bg-gray-900 text-white px-3 py-2.5 rounded-xl border-none cursor-pointer"
                >Add</button>
                <button
                  onClick={() => { setAddingTodo(false); setTodoText(''); }}
                  className="text-sm text-gray-400 bg-transparent border-none cursor-pointer"
                >Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTodo(true)}
                className="w-full text-left text-sm text-blue-500 font-semibold py-2 px-1 bg-transparent border-none cursor-pointer"
              >
                + Add to-do
              </button>
            )}
          </>
        );
      })()}
    </div>
  );
}
