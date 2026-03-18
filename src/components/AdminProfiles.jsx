import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';
import { FAMILY } from '../data/family';

function ProfileRow({ baseId }) {
  const { getMember, getTier, setTier, updateMember } = useApp();
  const m = getMember(baseId);
  const tier = getTier(m);
  const isAdmin = m.role === 'admin';
  const isInfant = m.tier === 'infant';

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState('');
  const [draftAge, setDraftAge] = useState('');
  const [draftBirthday, setDraftBirthday] = useState('');

  function startEdit() {
    setDraftName(m.name);
    setDraftAvatar(m.avatar);
    setDraftAge(String(m.age));
    setDraftBirthday(m.birthday || '');
    setEditing(true);
  }

  function save() {
    const changes = { name: draftName.trim() || m.name, avatar: draftAvatar.trim() || m.avatar };
    if (!isAdmin) {
      changes.age = parseInt(draftAge) || m.age;
      changes.birthday = draftBirthday || null;
    }
    updateMember(m.id, changes);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  const subLabel = isAdmin ? 'Admin' : isInfant ? 'Too young' : tier;

  return (
    <div className="bg-white rounded-xl mb-2 overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-3 p-3.5">
        <div className="text-3xl w-10 text-center">{m.avatar}</div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{m.name}</div>
          <div className="text-xs text-gray-500">
            {!isAdmin && `Age ${m.age} · `}{subLabel}
            {!isAdmin && m.birthday && (
              <span className="ml-1">· 🎂 {new Date(m.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer px-1"
          >
            Edit
          </button>
        )}
      </div>

      {/* Tier selector (children only, always visible) */}
      {!isAdmin && !isInfant && !editing && (
        <div className="flex gap-1.5 px-3.5 pb-3">
          {['teen', 'child'].map(t => (
            <button
              key={t}
              onClick={() => setTier(m.id, t)}
              className={`text-xs px-2.5 py-1 rounded-lg border-none cursor-pointer font-semibold capitalize ${
                tier === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'teen' ? 'Teen' : 'Child'}
            </button>
          ))}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="px-3.5 pb-4 pt-1 border-t border-gray-100 space-y-2.5">
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-1">Emoji</div>
            <input
              type="text"
              value={draftAvatar}
              onChange={e => setDraftAvatar(e.target.value)}
              className="w-16 text-center text-2xl bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200 outline-none focus:border-blue-400"
              maxLength={4}
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-1">Name</div>
            <input
              type="text"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
            />
          </div>
          {!isAdmin && (
            <div className="flex gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-1">Age</div>
                <input
                  type="number"
                  value={draftAge}
                  onChange={e => setDraftAge(e.target.value)}
                  min={0}
                  max={99}
                  className="w-20 bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-1">Birthday</div>
                <input
                  type="date"
                  value={draftBirthday}
                  onChange={e => setDraftBirthday(e.target.value)}
                  className="bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}
          {/* Tier selector in edit mode */}
          {!isAdmin && !isInfant && (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">Role</div>
              <div className="flex gap-1.5">
                {['teen', 'child'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTier(m.id, t)}
                    className={`text-xs px-2.5 py-1 rounded-lg border-none cursor-pointer font-semibold capitalize ${
                      tier === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t === 'teen' ? 'Teen' : 'Child'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={cancel}
              className="text-xs font-semibold text-gray-400 bg-transparent border-none cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProfiles() {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Manage Profiles</div>
      </div>

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Parents</div>
      {FAMILY.filter(m => m.role === 'admin').map(m => (
        <ProfileRow key={m.id} baseId={m.id} />
      ))}

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">Children</div>
      {FAMILY.filter(m => m.role === 'child').map(m => (
        <ProfileRow key={m.id} baseId={m.id} />
      ))}
    </div>
  );
}
