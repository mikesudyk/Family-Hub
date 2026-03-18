import { useState } from 'react';
import { BackButton, AdminButton } from './ui';
import { CHORE_LIBRARY } from '../data/family';

export default function AdminChoreBuilder() {
  const [search, setSearch] = useState('');
  const filtered = CHORE_LIBRARY.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Chore Builder</div>
        <AdminButton onClick={() => {}}>+ New</AdminButton>
      </div>

      <div className="bg-white rounded-xl p-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search chores..."
          className="w-full bg-transparent border-none text-sm outline-none font-sans"
        />
      </div>

      {filtered.map(c => (
        <div
          key={c.id}
          className="flex items-center gap-3 py-3"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <div className="text-2xl">{c.icon}</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{c.name}</div>
            <div className="text-xs text-gray-500">{c.rec} · Ages {c.ages}</div>
          </div>
          <button className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm cursor-pointer">
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
