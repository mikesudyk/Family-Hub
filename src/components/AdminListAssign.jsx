import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';
import { FAMILY } from '../data/family';

export default function AdminListAssign({ listId }) {
  const { getChoreList, assignListEvent, navigate } = useApp();
  const list = getChoreList(listId);
  const kids = FAMILY.filter(m => m.role === 'child' && m.tier !== 'infant');

  // assignments[choreId] = kidId (string) or '' for unassigned
  const [assignments, setAssignments] = useState({});

  if (!list) return <div className="p-5 text-gray-400">List not found.</div>;

  const totalAssignments = Object.values(assignments).filter(v => v !== '').length;

  function handleAssign() {
    const batch = list.chores
      .filter(chore => assignments[chore.id])
      .map(chore => ({ kidId: Number(assignments[chore.id]), name: chore.name, icon: chore.icon }));
    assignListEvent(listId, list.name, batch);
    navigate('hub');
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <BackButton to="admin-chore-list-detail" data={listId} />
        <div className="text-xl font-extrabold tracking-tight">Assign: {list.name}</div>
      </div>
      <div className="text-xs text-gray-400 mb-5">Select a child for each chore.</div>

      <div className="space-y-2">
        {list.chores.map(chore => (
          <div key={chore.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
            <span className="text-lg">{chore.icon}</span>
            <span className="flex-1 text-sm font-medium text-gray-800">{chore.name}</span>
            <select
              value={assignments[chore.id] || ''}
              onChange={e => setAssignments(prev => ({ ...prev, [chore.id]: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="">— Assign —</option>
              {kids.map(kid => (
                <option key={kid.id} value={kid.id}>
                  {kid.avatar} {kid.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={handleAssign}
        disabled={totalAssignments === 0}
        className={`w-full mt-5 text-sm font-semibold py-3 rounded-2xl border-none cursor-pointer transition-colors
          ${totalAssignments > 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
      >
        {totalAssignments > 0
          ? `Assign ${totalAssignments} chore${totalAssignments !== 1 ? 's' : ''} →`
          : 'Select kids to assign'}
      </button>
    </div>
  );
}
