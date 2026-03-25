import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, EmojiSelect, CHORE_EMOJIS } from './ui';
import { CHORE_LIBRARY } from '../data/family';

function getChoreIcon(name, allChores) {
  const lib = CHORE_LIBRARY.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (lib) return lib.icon;
  const existing = allChores.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.icon;
  return '✅';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function repeatLabel(repeat) {
  if (!repeat || repeat === 'once') return null;
  if (repeat === 'daily') return 'Every day';
  if (repeat === 'biweekly') return 'Every other week';
  if (repeat && typeof repeat === 'object' && repeat.biweekly) {
    const days = repeat.biweekly.join(', ');
    return `Every other week · ${days}`;
  }
  if (Array.isArray(repeat)) return repeat.join(', ');
  return null;
}

function AddChoreRow({ kidId, allChoreNames, allChores, onAdd }) {
  const [step, setStep] = useState('closed'); // 'closed' | 'name' | 'repeat'
  const [query, setQuery] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(CHORE_EMOJIS[0].emoji);
  const [repeatMode, setRepeatMode] = useState('once'); // 'once' | 'daily' | 'days'
  const [selectedDays, setSelectedDays] = useState([]);

  const suggestions = query.length > 0
    ? allChoreNames.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : [];

  function handleSelectName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSelectedName(trimmed);
    setSelectedIcon(getChoreIcon(trimmed, allChores));
    setQuery('');
    setStep('repeat');
  }

  function toggleDay(day) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function handleAdd() {
    let repeat = null;
    if (repeatMode === 'daily') repeat = 'daily';
    else if (repeatMode === 'biweekly' && selectedDays.length > 0) repeat = { biweekly: [...selectedDays] };
    else if (repeatMode === 'days' && selectedDays.length > 0) repeat = [...selectedDays];
    onAdd(kidId, selectedName, selectedIcon, repeat);
    setStep('closed');
    setQuery('');
    setSelectedName('');
    setSelectedIcon(CHORE_EMOJIS[0].emoji);
    setRepeatMode('once');
    setSelectedDays([]);
  }

  function handleCancel() {
    setStep('closed');
    setQuery('');
    setSelectedName('');
    setSelectedIcon(CHORE_EMOJIS[0].emoji);
    setRepeatMode('once');
    setSelectedDays([]);
  }

  if (step === 'closed') {
    return (
      <button
        onClick={() => setStep('name')}
        className="w-full text-left text-sm text-blue-500 font-semibold py-2 px-1 bg-transparent border-none cursor-pointer"
      >
        + Add chore
      </button>
    );
  }

  if (step === 'name') {
    return (
      <div className="relative mt-2">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSelectName(query)}
          placeholder="Type a chore name…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
            {suggestions.map(name => (
              <button
                key={name}
                onMouseDown={() => handleSelectName(name)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 border-none bg-transparent cursor-pointer"
              >
                <span>{getChoreIcon(name, allChores)}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={handleCancel} className="text-xs text-gray-400 mt-1 bg-transparent border-none cursor-pointer">Cancel</button>
      </div>
    );
  }

  // step === 'repeat'
  return (
    <div className="mt-3 space-y-2.5">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
        <span className="normal-case font-semibold text-gray-700">{selectedName}</span>
      </div>

      {/* Emoji picker */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Icon:</span>
        <EmojiSelect value={selectedIcon} onChange={setSelectedIcon} />
      </div>

      {/* Repeat mode pills */}
      <div className="flex gap-1.5 flex-wrap">
        {[{ label: 'Once', value: 'once' }, { label: 'Every day', value: 'daily' }, { label: 'Every other week', value: 'biweekly' }, { label: 'Choose days', value: 'days' }].map(opt => (
          <button
            key={opt.value}
            onClick={() => { setRepeatMode(opt.value); setSelectedDays([]); }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-none cursor-pointer ${repeatMode === opt.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Day selector — for specific days or biweekly */}
      {(repeatMode === 'days' || repeatMode === 'biweekly') && (
        <div className="flex gap-1">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border-none cursor-pointer ${selectedDays.includes(day) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {day[0]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={(repeatMode === 'days' || repeatMode === 'biweekly') && selectedDays.length === 0}
          className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
        >
          Add
        </button>
        <button onClick={handleCancel} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}

function EditChoreRow({ chore, onSave, onCancel }) {
  const [name, setName] = useState(chore.name);
  const [icon, setIcon] = useState(chore.icon);
  const isBiweeklyObj = chore.repeat && typeof chore.repeat === 'object' && chore.repeat.biweekly;
  const [repeatMode, setRepeatMode] = useState(
    !chore.repeat || chore.repeat === 'once' ? 'once'
    : chore.repeat === 'daily' ? 'daily'
    : (chore.repeat === 'biweekly' || isBiweeklyObj) ? 'biweekly' : 'days'
  );
  const [selectedDays, setSelectedDays] = useState(
    isBiweeklyObj ? chore.repeat.biweekly : Array.isArray(chore.repeat) ? chore.repeat : []
  );

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    let repeat = null;
    if (repeatMode === 'daily') repeat = 'daily';
    else if (repeatMode === 'biweekly' && selectedDays.length > 0) repeat = { biweekly: [...selectedDays] };
    else if (repeatMode === 'days' && selectedDays.length > 0) repeat = [...selectedDays];
    onSave({ name: trimmed, icon, repeat });
  }

  return (
    <div className="bg-brand-light rounded-xl px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <EmojiSelect value={icon} onChange={setIcon} />
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="flex-1 bg-white rounded-lg px-3 py-1.5 text-sm border-none outline-none"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[{ label: 'Once', value: 'once' }, { label: 'Every day', value: 'daily' }, { label: 'Every other week', value: 'biweekly' }, { label: 'Choose days', value: 'days' }].map(opt => (
          <button
            key={opt.value}
            onClick={() => { setRepeatMode(opt.value); setSelectedDays([]); }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-none cursor-pointer ${repeatMode === opt.value ? 'bg-brand text-white' : 'bg-white text-gray-600'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {(repeatMode === 'days' || repeatMode === 'biweekly') && (
        <div className="flex gap-1">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border-none cursor-pointer ${selectedDays.includes(day) ? 'bg-brand text-white' : 'bg-white text-gray-500'}`}
            >
              {day[0]}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={(repeatMode === 'days' || repeatMode === 'biweekly') && selectedDays.length === 0}
          className="text-xs font-semibold bg-brand text-white px-4 py-1.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}

export default function AdminAssignments() {
  const { chores, getChores, addChore, removeChore, updateChore, getAllMembers } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const kids = getAllMembers().filter(m => m.role === 'child' && m.tier !== 'infant');

  const allChores = Object.values(chores).flat();
  const allChoreNames = [...new Set([
    ...CHORE_LIBRARY.map(c => c.name),
    ...allChores.map(c => c.name),
  ])].sort();

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight">Assignments</div>
      </div>

      <div className="space-y-3">
        {kids.map(k => {
          const kidChores = getChores(k.id);
          const expanded = expandedId === k.id;
          return (
            <div key={k.id} className="bg-white rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : k.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-transparent border-none cursor-pointer text-left"
              >
                <span className="text-2xl">{k.avatar}</span>
                <span className="font-bold text-base flex-1">{k.name}</span>
                <span className="text-xs text-gray-400">{kidChores.length} chore{kidChores.length !== 1 ? 's' : ''}</span>
                <span className="text-gray-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
              </button>

              {expanded && (
                <div className="px-4 pb-4">
                  <div className="space-y-1">
                    {kidChores.length === 0 && (
                      <div className="text-xs text-gray-400 py-1">No chores assigned yet.</div>
                    )}
                    {kidChores.map(chore => (
                      editingId === chore.id ? (
                        <EditChoreRow
                          key={chore.id}
                          chore={chore}
                          onSave={changes => { updateChore(k.id, chore.id, changes); setEditingId(null); }}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <div key={chore.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                          <span className="text-base">{chore.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800">{chore.name}</div>
                            {repeatLabel(chore.repeat) && (
                              <div className="text-xs text-gray-400">{repeatLabel(chore.repeat)}</div>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingId(chore.id)}
                            className="text-xs text-brand font-semibold bg-transparent border-none cursor-pointer px-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeChore(k.id, chore.id)}
                            className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
                          >
                            ×
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                  <AddChoreRow
                    kidId={k.id}
                    allChoreNames={allChoreNames}
                    allChores={allChores}
                    onAdd={addChore}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
