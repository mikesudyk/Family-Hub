import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, UncheckedCircle } from './ui';

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function FamilyGoals() {
  const { familyGoals, toggleFamilyGoal, addFamilyGoal, removeFamilyGoal, updateFamilyGoal } = useApp();
  const [newText, setNewText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const active  = familyGoals.active  || [];
  const history = familyGoals.history || [];

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    addFamilyGoal(text);
    setNewText('');
  }

  function startEdit(goal) {
    setEditingId(goal.id);
    setEditText(goal.text);
  }

  function saveEdit(id) {
    const text = editText.trim();
    if (text) updateFamilyGoal(id, text);
    setEditingId(null);
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="hub" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Family Goals</div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs font-semibold text-brand bg-transparent border-none cursor-pointer"
          >
            {showHistory ? 'Hide history' : 'History'}
          </button>
        )}
      </div>

      {/* Active goals */}
      <div className="space-y-2 mb-4">
        {active.length === 0 && (
          <div className="bg-white rounded-lg p-4 text-center text-gray-400 text-sm">
            No active goals. Add one below!
          </div>
        )}
        {active.map(g => (
          <div key={g.id} className="bg-white rounded-lg px-3.5 py-3 flex items-center gap-3">
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
              className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1 flex-shrink-0"
            >×</button>
          </div>
        ))}
      </div>

      {/* Add goal */}
      <div className="flex items-center gap-2 mb-6">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a family goal…"
          className="flex-1 bg-white rounded-lg px-3.5 py-3 text-sm border-none outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="text-xs font-semibold bg-brand text-white px-3 py-2.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
        >Add</button>
      </div>

      {/* History */}
      {showHistory && (
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Completed (last 30 days)
          </div>
          {history.length === 0 ? (
            <div className="bg-white rounded-lg p-4 text-center text-gray-400 text-sm">No completed goals yet.</div>
          ) : (
            <div className="space-y-2">
              {history.map(g => (
                <div key={g.id} className="bg-white rounded-lg px-3.5 py-3 flex items-center gap-3 opacity-60">
                  <button
                    onClick={() => toggleFamilyGoal(g.id)}
                    className="text-green-500 bg-transparent border-none cursor-pointer p-0 flex-shrink-0 text-lg leading-none"
                    title="Mark incomplete"
                  >✅</button>
                  <span className="flex-1 text-sm font-semibold text-gray-500 line-through">{g.text}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(g.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
