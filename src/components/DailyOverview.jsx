import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UncheckedCircle, EmojiSelect, CHORE_EMOJIS } from './ui';

export default function DailyOverview({ onClose }) {
  const { getChores, addChore, removeChore, getMember, getAllMembers } = useApp();
  const kids = getAllMembers().filter(m => m.role === 'child' && m.tier !== 'infant');

  // Track which kid's add-form is open and the draft text/icon
  const [addingFor, setAddingFor] = useState(null);
  const [draft, setDraft] = useState('');
  const [draftIcon, setDraftIcon] = useState(CHORE_EMOJIS[0].emoji);

  function handleAdd(kidId) {
    const name = draft.trim();
    if (name) addChore(kidId, name, draftIcon);
    setDraft('');
    setDraftIcon(CHORE_EMOJIS[0].emoji);
    setAddingFor(null);
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto rounded-t-3xl overflow-y-auto"
        style={{ background: '#F9F5F0', maxHeight: '85%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="text-base font-extrabold text-gray-900">Today's Overview</div>
          <button
            onClick={onClose}
            className="text-gray-400 bg-transparent border-none cursor-pointer text-2xl leading-none"
          >×</button>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {kids.map(kid => {
            const member = getMember(kid.id);
            const chores = getChores(kid.id);
            const done = chores.filter(c => c.done).length;
            const total = chores.length;
            const isAdding = addingFor === kid.id;

            return (
              <div key={kid.id} className="bg-white rounded-2xl p-3">
                {/* Kid header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{member.avatar}</span>
                  <div className="font-bold text-sm text-gray-900 flex-1">{member.name}</div>
                  <span className="text-xs font-semibold text-gray-400">{done}/{total} done</span>
                </div>

                {/* Chore list */}
                {total === 0 && !isAdding ? (
                  <div className="text-xs text-gray-400 pl-1 mb-1">No chores today</div>
                ) : (
                  <div className="space-y-1 mb-1">
                    {chores.map(c => (
                      <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-xl">
                        <span className="text-sm">{c.icon}</span>
                        <span className={`text-xs flex-1 ${c.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{c.name}</span>
                        <span className="text-sm">{c.done ? '✅' : <UncheckedCircle />}</span>
                        <button
                          onClick={() => removeChore(kid.id, c.id)}
                          className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-base leading-none ml-1"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add chore inline form */}
                {isAdding ? (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <EmojiSelect value={draftIcon} onChange={setDraftIcon} className="text-sm" />
                      <input
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(kid.id); if (e.key === 'Escape') { setAddingFor(null); setDraft(''); setDraftIcon(CHORE_EMOJIS[0].emoji); } }}
                        placeholder="Chore name…"
                        className="flex-1 bg-white rounded-lg px-2.5 py-1 text-xs border border-gray-200 outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAdd(kid.id)}
                        className="text-xs font-semibold text-white bg-gray-900 px-2.5 py-1 rounded-lg border-none cursor-pointer"
                      >Add</button>
                      <button
                        onClick={() => { setAddingFor(null); setDraft(''); setDraftIcon(CHORE_EMOJIS[0].emoji); }}
                        className="text-xs text-gray-400 bg-transparent border-none cursor-pointer"
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingFor(kid.id); setDraft(''); }}
                    className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer mt-0.5"
                  >+ Add chore</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
