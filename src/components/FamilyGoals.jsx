import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, SectionLabel, UncheckedCircle } from './ui';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function GoalDateSection({ date, goals, isToday }) {
  const { toggleFamilyGoal, addFamilyGoal, removeFamilyGoal, updateFamilyGoal } = useApp();
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState('');

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    addFamilyGoal(date, text);
    setNewText('');
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <SectionLabel>{formatDate(date)}</SectionLabel>
        <button
          onClick={() => { setEditing(e => !e); setNewText(''); }}
          className="bg-transparent border-none cursor-pointer p-0 leading-none mb-1"
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
      </div>

      {goals.map(g => (
        <div key={g.id} className="bg-white rounded-xl mb-2 flex items-center gap-3 px-3.5 py-3">
          {editing ? (
            <>
              <input
                value={g.text}
                onChange={e => updateFamilyGoal(date, g.id, e.target.value)}
                className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-none outline-none"
              />
              <button
                onClick={() => removeFamilyGoal(date, g.id)}
                className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none"
              >×</button>
            </>
          ) : (
            <button
              onClick={() => isToday ? toggleFamilyGoal(date, g.id) : undefined}
              className={`w-full flex items-center gap-3 bg-transparent border-none text-left ${isToday ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`text-lg leading-none ${g.done ? 'text-green-500' : 'text-gray-300'}`}>
                {g.done ? '✅' : <UncheckedCircle />}
              </span>
              <span className={`text-sm font-semibold ${g.done ? 'line-through text-gray-400' : 'text-gray-900'} ${!isToday ? 'opacity-75' : ''}`}>
                {g.text}
              </span>
            </button>
          )}
        </div>
      ))}

      {editing && (
        <div className="flex items-center gap-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
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
    </div>
  );
}

export default function FamilyGoals() {
  const { familyGoals, addFamilyGoal } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const dates = Object.keys(familyGoals).sort().reverse();

  // Ensure today always appears even if no goals yet
  const allDates = dates.includes(today) ? dates : [today, ...dates];

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="hub" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Family Goals</div>
      </div>

      {allDates.map(date => (
        <GoalDateSection
          key={date}
          date={date}
          goals={familyGoals[date] || []}
          isToday={date === today}
        />
      ))}
    </div>
  );
}
