import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';

export default function AdminChoreLists() {
  const { choreLists, addChoreList, deleteChoreList, navigate } = useApp();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = addChoreList(trimmed);
    setNewName('');
    setCreating(false);
    navigate('admin-chore-list-detail', id);
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight">Chore Lists</div>
      </div>

      <div className="space-y-3">
        {choreLists.map(list => (
          <div key={list.id} className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-base flex-1">{list.name}</span>
              <span className="text-xs text-gray-400">{list.chores.length} chore{list.chores.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => deleteChoreList(list.id)}
                className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-xl leading-none px-1"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate('admin-chore-list-detail', list.id)}
                className="flex-1 text-sm font-semibold py-2 rounded-xl bg-white border border-gray-200 cursor-pointer"
              >
                Edit List
              </button>
              <button
                onClick={() => navigate('admin-list-assign', list.id)}
                className="flex-1 text-sm font-semibold py-2 rounded-xl bg-blue-500 text-white border-none cursor-pointer"
              >
                Assign Kids
              </button>
            </div>
          </div>
        ))}

        {choreLists.length === 0 && !creating && (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
            No lists yet. Create one below.
          </div>
        )}

        {creating ? (
          <div className="bg-white rounded-2xl p-4">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="List name (e.g. Whole House Clean)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCreating(false); setNewName(''); }}
                className="flex-1 text-sm py-2 rounded-xl bg-white border border-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 text-sm font-semibold py-2 rounded-xl bg-blue-500 text-white border-none cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full text-sm font-semibold text-blue-500 py-3 bg-transparent border-none cursor-pointer"
          >
            + New List
          </button>
        )}
      </div>
    </div>
  );
}
