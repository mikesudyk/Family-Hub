import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AddGoalRow({ kidId, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(kidId, trimmed, '🎯', dueDate || null);
    setText('');
    setDueDate('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-sm text-blue-500 font-semibold py-2 px-1 bg-transparent border-none cursor-pointer"
      >
        + Add goal
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') { setOpen(false); setText(''); setDueDate(''); }
        }}
        placeholder="e.g. Read 20 minutes each night"
        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 flex-shrink-0">Due date</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="text-sm font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer"
        >
          Add
        </button>
        <button
          onClick={() => { setOpen(false); setText(''); setDueDate(''); }}
          className="text-sm text-gray-400 bg-transparent border-none cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function GoalRow({ kidId, goal, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editDue, setEditDue] = useState('');

  function startEdit() {
    setEditText(goal.text);
    setEditDue(goal.dueDate?.split('T')[0] || '');
    setEditing(true);
  }

  function handleSave() {
    if (editText.trim()) onUpdate(kidId, goal.id, editText.trim(), editDue || null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-gray-50 rounded-xl px-3 py-3 space-y-2">
        <input
          autoFocus
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-full bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
          placeholder="Goal text"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 flex-shrink-0">Due date</label>
          <input
            type="date"
            value={editDue}
            onChange={e => setEditDue(e.target.value)}
            className="flex-1 bg-white rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="text-sm font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer"
          >Save</button>
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-gray-400 bg-transparent border-none cursor-pointer"
          >Cancel</button>
          <button
            onClick={() => { onRemove(kidId, goal.id); setEditing(false); }}
            className="ml-auto text-sm text-red-400 bg-transparent border-none cursor-pointer"
          >Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
      <span className="text-base">🎯</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{goal.text}</div>
        {goal.dueDate && (
          <div className="text-xs text-gray-400">Due {formatDueDate(goal.dueDate)}</div>
        )}
      </div>
      <button
        onClick={startEdit}
        className="text-gray-300 hover:text-gray-500 bg-transparent border-none cursor-pointer text-sm px-1"
      >✏️</button>
    </div>
  );
}

export default function AdminSchoolGoals() {
  const { getGoals, addGoal, updateGoal, removeGoal, getAllMembers } = useApp();
  const kids = getAllMembers().filter(m => m.role === 'child' && m.tier !== 'infant');

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight">School Goals</div>
      </div>

      <div className="space-y-4">
        {kids.map(k => {
          const kidGoals = getGoals(k.id);
          return (
            <div key={k.id} className="bg-white rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{k.avatar}</span>
                <span className="font-bold text-base">{k.name}</span>
                <span className="ml-auto text-xs text-gray-400">{kidGoals.length} goal{kidGoals.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-1">
                {kidGoals.length === 0 && (
                  <div className="text-xs text-gray-400 py-1">No goals yet.</div>
                )}
                {kidGoals.map(goal => (
                  <GoalRow
                    key={goal.id}
                    kidId={k.id}
                    goal={goal}
                    onUpdate={updateGoal}
                    onRemove={removeGoal}
                  />
                ))}
              </div>

              <AddGoalRow kidId={k.id} onAdd={addGoal} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
