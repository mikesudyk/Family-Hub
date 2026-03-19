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

function timeUntil(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function InviteSpouseRow({ onInviteSent, hasExisting }) {
  const [open, setOpen]     = useState(false);
  const [email, setEmail]   = useState('');
  const [status, setStatus] = useState('idle');
  const [inviteUrl, setInviteUrl] = useState(null);
  const [copied, setCopied] = useState(false);

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
      onInviteSent();
    } catch {
      setStatus('error');
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
        <div className="text-sm font-semibold text-gray-400">{hasExisting ? 'Send another invite' : 'Invite spouse'}</div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl mb-2 overflow-hidden">
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">+</div>
        <div className="flex-1 text-sm font-semibold text-gray-900">Invite spouse</div>
        <button onClick={() => { setOpen(false); setStatus('idle'); setInviteUrl(null); }} className="text-gray-300 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
      </div>

      <div className="px-3.5 pb-4 border-t border-gray-100 pt-3 space-y-2">
        {status === 'sent' && !inviteUrl && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-green-600 text-sm font-bold">✓</span>
            <span className="text-xs font-semibold text-green-800">Invite sent to {email}</span>
          </div>
        )}
        {inviteUrl && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <div className="text-xs text-amber-700 font-semibold mb-1">Email couldn't send — share this link:</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-500 font-mono truncate border border-amber-100">{inviteUrl}</div>
              <button
                onClick={copyUrl}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer text-white flex-shrink-0"
                style={{ background: copied ? '#4FA45A' : '#111827' }}
              >{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="text-xs text-red-500">Failed to create invite. Try again.</div>
        )}
        {status !== 'sent' && (
          <>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="Spouse's email address"
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
            />
            <button
              onClick={sendInvite}
              disabled={!email.trim() || status === 'sending'}
              className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
            >
              {status === 'sending' ? 'Sending…' : 'Send Invite'}
            </button>
          </>
        )}
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

function AccountSettings() {
  const [section, setSection] = useState(null); // null | 'email' | 'password'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [status, setStatus]           = useState('idle');
  const [errorMsg, setErrorMsg]       = useState('');

  function reset() {
    setCurrentPassword(''); setNewEmail(''); setNewPassword(''); setConfirm('');
    setStatus('idle'); setErrorMsg('');
  }

  function open(s) { reset(); setSection(s); }
  function close() { reset(); setSection(null); }

  async function save() {
    if (section === 'password' && newPassword !== confirm) {
      setErrorMsg('Passwords do not match'); return;
    }
    if (section === 'password' && newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters'); return;
    }
    setStatus('saving'); setErrorMsg('');
    try {
      await apiFetch('/api/auth/account', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          ...(section === 'email'    ? { newEmail }    : {}),
          ...(section === 'password' ? { newPassword } : {}),
        }),
      });
      setStatus('ok');
      setTimeout(close, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <div className="mt-6">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Account</div>
      <div className="bg-white rounded-xl overflow-hidden">
        {!section ? (
          <div className="flex gap-2 p-3.5">
            <button
              onClick={() => open('email')}
              className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border-none cursor-pointer"
            >
              Change email
            </button>
            <button
              onClick={() => open('password')}
              className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border-none cursor-pointer"
            >
              Change password
            </button>
          </div>
        ) : (
          <div className="p-3.5 space-y-2">
            <div className="text-sm font-semibold text-gray-900">
              {section === 'email' ? 'Change email' : 'Change password'}
            </div>
            {status === 'ok' && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs font-semibold text-green-800">
                {section === 'email' ? 'Email updated!' : 'Password updated!'}
              </div>
            )}
            {errorMsg && <div className="text-xs text-red-500">{errorMsg}</div>}

            {section === 'email' && (
              <input
                autoFocus
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="New email address"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
              />
            )}
            {section === 'password' && (
              <>
                <input
                  autoFocus
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
                />
              </>
            )}
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="Current password to confirm"
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-200 outline-none focus:border-blue-400"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={status === 'saving' || status === 'ok' || !currentPassword || (section === 'email' ? !newEmail : !newPassword)}
                className="text-xs font-semibold bg-gray-900 text-white px-4 py-1.5 rounded-lg border-none cursor-pointer disabled:opacity-40"
              >
                {status === 'saving' ? 'Saving…' : 'Save'}
              </button>
              <button onClick={close} className="text-xs font-semibold text-gray-400 bg-transparent border-none cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminProfiles() {
  const { getAllMembers } = useApp();
  const members = getAllMembers();
  const [pendingInvites, setPendingInvites] = useState([]);
  const [resendingId, setResendingId] = useState(null);
  const [resentId, setResentId]       = useState(null);
  const [copyId, setCopyId]           = useState(null);

  function loadInvites() {
    apiFetch('/api/auth/invites').then(setPendingInvites).catch(() => {});
  }

  useEffect(() => { loadInvites(); }, []);

  async function resendInvite(inv) {
    setResendingId(inv.id);
    try {
      const res = await apiFetch(`/api/auth/invite/resend/${inv.id}`, { method: 'POST' });
      if (res.inviteUrl) {
        navigator.clipboard.writeText(res.inviteUrl).catch(() => {});
        setCopyId(inv.id);
        setTimeout(() => setCopyId(null), 3000);
      } else {
        setResentId(inv.id);
        setTimeout(() => setResentId(null), 3000);
      }
      loadInvites();
    } catch {
      // silently fail
    } finally {
      setResendingId(null);
    }
  }

  async function deleteInvite(inv) {
    await apiFetch(`/api/auth/invite/${inv.id}`, { method: 'DELETE' }).catch(() => {});
    loadInvites();
  }

  const parents = members.filter(m => m.role === 'admin');

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Manage Profiles</div>
      </div>

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Parents</div>
      {parents.map(m => (
        <ProfileRow key={m.id} member={m} />
      ))}

      {/* Persistent pending invites */}
      {pendingInvites.map(inv => (
        <div key={inv.id} className="bg-white rounded-xl mb-2 px-3.5 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">✉️</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">{inv.email}</div>
            <div className="text-xs text-gray-400">Invited {timeAgo(inv.created_at)} · expires in {timeUntil(inv.expires_at)}</div>
          </div>
          <button
            onClick={() => resendInvite(inv)}
            disabled={resendingId === inv.id}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer text-white flex-shrink-0 disabled:opacity-40"
            style={{ background: resentId === inv.id || copyId === inv.id ? '#4FA45A' : '#111827' }}
          >
            {resendingId === inv.id ? 'Sending…' : resentId === inv.id ? 'Sent!' : copyId === inv.id ? 'Link copied!' : 'Resend'}
          </button>
          <button
            onClick={() => deleteInvite(inv)}
            className="text-gray-300 bg-transparent border-none cursor-pointer text-xl leading-none flex-shrink-0"
          >×</button>
        </div>
      ))}

      {parents.length < 2 && (
        <InviteSpouseRow onInviteSent={loadInvites} hasExisting={pendingInvites.length > 0} />
      )}

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4">Children</div>
      {members.filter(m => m.role === 'child').map(m => (
        <ProfileRow key={m.id} member={m} />
      ))}
      <AddChildRow />

      <AccountSettings />
    </div>
  );
}
