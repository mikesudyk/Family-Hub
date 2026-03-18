import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, EmojiSelect, CHORE_EMOJIS } from './ui';
import { CHORE_LIBRARY } from '../data/family';

function getChoreIcon(name, existingChores) {
  const lib = CHORE_LIBRARY.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (lib) return lib.icon;
  const found = existingChores.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found.icon;
  return '✅';
}

export default function AdminChoreListDetail({ listId }) {
  const { getChoreList, addChoreToList, removeChoreFromList, updateChoreListName, navigate, choreLists } = useApp();
  const list = getChoreList(listId);

  const [addingChore, setAddingChore] = useState(false);
  const [query, setQuery] = useState('');
  const [addIcon, setAddIcon] = useState(CHORE_EMOJIS[0].emoji);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  if (!list) return <div className="p-5 text-gray-400">List not found.</div>;

  const allChoreNames = [...new Set([
    ...CHORE_LIBRARY.map(c => c.name),
    ...choreLists.flatMap(l => l.chores.map(c => c.name)),
  ])].sort();

  const suggestions = query.length > 0
    ? allChoreNames.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : [];

  function handleAddChore(name, icon) {
    const trimmed = name.trim();
    if (!trimmed) return;
    addChoreToList(listId, trimmed, icon || addIcon);
    setQuery('');
    setAddIcon(CHORE_EMOJIS[0].emoji);
    setAddingChore(false);
  }

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (trimmed) updateChoreListName(listId, trimmed);
    setEditingName(false);
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-chore-lists" />
        {editingName ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
            onBlur={handleSaveName}
            className="flex-1 text-xl font-extrabold tracking-tight border-b-2 border-blue-400 outline-none bg-transparent"
          />
        ) : (
          <button
            onClick={() => { setNameInput(list.name); setEditingName(true); }}
            className="text-xl font-extrabold tracking-tight bg-transparent border-none cursor-pointer text-left flex-1"
          >
            {list.name} ✏️
          </button>
        )}
      </div>

      <div className="space-y-1 mb-3">
        {list.chores.length === 0 && (
          <div className="text-xs text-gray-400 py-2">No chores yet. Add some below.</div>
        )}
        {list.chores.map(chore => (
          <div key={chore.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
            <span className="text-base">{chore.icon}</span>
            <span className="flex-1 text-sm font-medium text-gray-800">{chore.name}</span>
            <button
              onClick={() => removeChoreFromList(listId, chore.id)}
              className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {addingChore ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <EmojiSelect value={addIcon} onChange={setAddIcon} />
            <div className="relative flex-1">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddChore(query)}
                placeholder="Type a chore name..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                  {suggestions.map(name => (
                    <button
                      key={name}
                      onMouseDown={() => { setAddIcon(getChoreIcon(name, list.chores)); handleAddChore(name, getChoreIcon(name, list.chores)); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 border-none bg-transparent cursor-pointer"
                    >
                      <span>{getChoreIcon(name, list.chores)}</span>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => { setAddingChore(false); setQuery(''); setAddIcon(CHORE_EMOJIS[0].emoji); }}
            className="text-xs text-gray-400 bg-transparent border-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingChore(true)}
          className="w-full text-left text-sm text-blue-500 font-semibold py-2 px-1 bg-transparent border-none cursor-pointer"
        >
          + Add chore
        </button>
      )}

      {list.chores.length > 0 && (
        <button
          onClick={() => navigate('admin-list-assign', listId)}
          className="w-full mt-5 text-sm font-semibold py-3 rounded-2xl bg-blue-500 text-white border-none cursor-pointer"
        >
          Assign Kids to This List →
        </button>
      )}
    </div>
  );
}
