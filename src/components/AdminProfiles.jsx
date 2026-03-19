import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';
import { apiFetch } from '../api/client';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function InviteSpouseRow() {
  const [open, setOpen]           = useState(false);
  const [email, setEmail]         = useState('');
  const [status, setStatus]       = useState('idle'); // idle | sending | sent | error
  const [inviteUrl, setInviteUrl] = useState(null);
  const [copied, setCopied]       = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [resendingId, setResendingId]       = useState(null);
  const [resentId, setResentId]             = useState(null);

  useEffect(() => {
    if (!open) return;
    apiFetch('/api/auth/invites').then(setPendingInvites).catch(() => {});
  }, [open]);

  async function sendInvite() {
    if (!email.trim()) return;
    setStatus('sending');
    try {
      const res = await apiFetch('/api/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus('sent');
      if (res.inviteUrl) setInviteUrl(res.inviteUrl);
      apiFetch('/api/auth/invites').then(setPendingInvites).catch(() => {});
    } catch {
      setStatus('error');
    }
  }

  async function resendInvite(invite) {
    setResendingId(invite.id);
    try {
      const res = await apiFetch(`/api/auth/invite/resend/${invite.id}`, { method: 'POST' });
      if (res.inviteUrl) setInviteUrl(res.inviteUrl);
      setResentId(invite.id);
      setTimeout(() => setResentId(null), 3000);
      apiFetch('/api/auth/invites').then(setPendingInvites).catch(() => {});
    } catch {
      // silently fail — user can try again
    } finally {
      setResendingId(null);
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-white rounded-xl mb-2 px-3.5 py-3 border-none cursor-pointer text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">+</div>
        <div className="text-sm font-semibold text-gray-400">Invite spouse</div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl mb-2 overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">+</div>
        <div className="flex-1 text-sm font-semibold text-gray-900">Invite spouse</div>
        <button onClick={() => setOpen(false)} className="text-gray-300 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="px-3.5 pb-3 space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending</div>
          {pendingInvites.map(inv => (
            <div key={inv.id} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{inv.email}</div>
                <div className="text-xs text-gray-400">Sent {timeAgo(inv.created_at)}</div>
              </div>
              <button
                onClick={() => resendInvite(inv)}
                disabled={resendingId === inv.id}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer text-white flex-shrink-0 disabled:opacity-40"
                style={{ background: resentId === inv.id ? '#4FA45A' : '#111827' }}
              >
                {resendingId === inv.id ? 'Sending…' : resentId === inv.id ? 'Sent!' : 'Resend'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invite URL (shown after send/resend when no email configured) */}
      {inviteUrl && (
        <div className="px-3.5 pb-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <div className="text-xs text-amber-600 mb-2">No email configured — share this link directly:</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-500 font-mono truncate border border-amber-100">
                {inviteUrl}
              </div>
              <button
                onClick={copyUrl}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-white flex-shrink-0"
                style={{ background: copied ? '#4FA45A' : '#111827' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New invite form */}
      <div className="px-3.5 pb-4 border-t border-gray-100 pt-3 space-y-2">
        {status === 'sent' && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-green-600 text-sm font-bold">✓</span>
            <span className="text-xs font-semibold text-green-800">Invite sent to {email}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="text-xs text-red-500">Failed to send invite. Try again.</div>
        )}
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          placeholder={pendingInvites.length > 0 ? 'Send to a different email…' : "Spouse's email address"}
          className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
        />
        <button
          onClick={sendInvite}
          disabled={!email.trim() || status === 'sending'}
          className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
        >
          {status === 'sending' ? 'Sending…' : 'Send Invite'}
        </button>
      </div>
    </div>
  );
}
function computeAge(birthday) {
  if (!birthday) return null;
  const diff = Date.now() - new Date(birthday + 'T00:00:00').getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function ProfileRow({ member: m }) {
  const { getTier, setTier, updateMember } = useApp();
  const tier = getTier(m);
  const isAdmin = m.role === 'admin';
  const isInfant = m.tier === 'infant';
  const age = computeAge(m.birthday);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState('');
  const [draftBirthday, setDraftBirthday] = useState('');

  function startEdit() {
    setDraftName(m.name);
    setDraftAvatar(m.avatar);
    setDraftBirthday(m.birthday || '');
    setEditing(true);
  }

  function save() {
    const changes = { name: draftName.trim() || m.name, avatar: draftAvatar.trim() || m.avatar };
    if (!isAdmin) changes.birthday = draftBirthday || null;
    updateMember(m.id, changes);
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
            {!isAdmin && age !== null && `Age ${age} · `}{subLabel}
            {!isAdmin && m.birthday && (
              <span className="ml-1">· 🎂 {new Date(m.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
        </div>
        {!editing && (
          <button onClick={startEdit} className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer px-1">
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
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">Birthday</div>
              <input
                type="date"
                value={draftBirthday}
                onChange={e => setDraftBirthday(e.target.value)}
                className="bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
              />
            </div>
          )}
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
            <button onClick={save} className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs font-semibold text-gray-400 bg-transparent border-none cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddChildRow() {
  const { addMember } = useApp();
  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState('');
  const [avatar, setAvatar]     = useState('👦');
  const [tier, setTier]         = useState('child');
  const [birthday, setBirthday] = useState('');
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addMember({ name: name.trim(), avatar, tier, birthday: birthday || null });
      setName(''); setAvatar('👦'); setTier('child'); setBirthday('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-white rounded-xl mb-2 px-3.5 py-3 border-none cursor-pointer text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">+</div>
        <div className="text-sm font-semibold text-gray-400">Add child</div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl mb-2 overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        <div className="text-3xl w-10 text-center">{avatar}</div>
        <div className="flex-1 text-sm font-semibold text-gray-900">Add child</div>
        <button onClick={() => setOpen(false)} className="text-gray-300 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
      </div>
      <div className="px-3.5 pb-4 border-t border-gray-100 pt-3 space-y-2.5">
        <div className="flex gap-3">
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-1">Emoji</div>
            <input
              type="text"
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              className="w-16 text-center text-2xl bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200 outline-none focus:border-blue-400"
              maxLength={4}
            />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-400 mb-1">Name</div>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="Child's name"
              className="w-full bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">Birthday</div>
          <input
            type="date"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            className="bg-gray-50 rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">Role</div>
          <div className="flex gap-1.5">
            {['child', 'teen'].map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`text-xs px-2.5 py-1 rounded-lg border-none cursor-pointer font-semibold capitalize ${
                  tier === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t === 'teen' ? 'Teen' : 'Child'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
          >
            {saving ? 'Adding…' : 'Add Child'}
          </button>
          <button onClick={() => setOpen(false)} className="text-xs font-semibold text-gray-400 bg-transparent border-none cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProfiles() {
  const { getAllMembers } = useApp();
  const members = getAllMembers();

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Manage Profiles</div>
      </div>

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Parents</div>
      {members.filter(m => m.role === 'admin').map(m => (
        <ProfileRow key={m.id} member={m} />
      ))}
      {members.filter(m => m.role === 'admin').length < 2 && <InviteSpouseRow />}

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">Children</div>
      {members.filter(m => m.role === 'child').map(m => (
        <ProfileRow key={m.id} member={m} />
      ))}
      <AddChildRow />
    </div>
  );
}
