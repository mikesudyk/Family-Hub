import { useState } from 'react';
import { useApp } from '../context/AppContext';

const GREEN = '#4FA45A';
const DARK  = '#111827';

const AVATAR_EMOJIS = [
  '👨', '👩', '🧑', '👱', '👱‍♀️', '🧔', '🧔‍♀️',
  '👦', '👧', '🧒', '👶', '👨‍🦱', '👩‍🦱',
  '👨‍🦰', '👩‍🦰', '👨‍🦳', '👩‍🦳', '👨‍🦲', '👩‍🦲',
  '🧓', '🦸', '🦸‍♀️', '🧙', '🧙‍♀️', '🤴', '👸',
  '🦹', '🦹‍♀️', '🧝', '🧝‍♀️', '🎅', '🤶',
];

function ProgressBar({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            i < step ? 'bg-green-400' : i === step ? 'bg-gray-900' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function AvatarGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {AVATAR_EMOJIS.map(em => (
        <button
          key={em}
          onClick={() => onChange(em)}
          className={`w-9 h-9 text-xl flex items-center justify-center rounded-xl border-2 transition-all cursor-pointer bg-transparent ${
            value === em ? 'border-gray-900 bg-gray-50' : 'border-transparent hover:border-gray-200'
          }`}
        >
          {em}
        </button>
      ))}
    </div>
  );
}

// Step 1 — Family name
function StepFamilyName({ initial, onNext }) {
  const [name, setName] = useState(initial || '');
  const preview = name.trim() ? `${name.trim()} Hub` : '';

  return (
    <div>
      <div className="text-2xl font-extrabold tracking-tight mb-1">Name your family</div>
      <div className="text-sm text-gray-400 mb-6">This will appear at the top of your hub</div>

      <div className="relative mb-3">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onNext(name.trim())}
          placeholder="e.g. Smith"
          maxLength={20}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-semibold outline-none focus:border-gray-400 pr-14"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">Hub</span>
      </div>

      {preview && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-5 text-sm">
          <span>🏠</span>
          <span className="font-bold text-gray-900">{preview}</span>
          <span className="text-gray-400 text-xs ml-auto">preview</span>
        </div>
      )}

      <button
        onClick={() => name.trim() && onNext(name.trim())}
        disabled={!name.trim()}
        className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white disabled:opacity-30"
        style={{ background: DARK }}
      >
        Continue →
      </button>
    </div>
  );
}

// Step 2 — Parent profile
function StepYourProfile({ initialName, onNext }) {
  const [name, setName]     = useState(initialName || '');
  const [avatar, setAvatar] = useState('👨');

  return (
    <div>
      <div className="text-2xl font-extrabold tracking-tight mb-1">Your profile</div>
      <div className="text-sm text-gray-400 mb-4">How you'll appear in the family hub</div>

      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
          {avatar}
        </div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 text-sm font-semibold bg-transparent border-none outline-none placeholder-gray-300"
        />
      </div>

      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pick your avatar</div>
      <div className="bg-white border border-gray-100 rounded-xl p-3 mb-5">
        <AvatarGrid value={avatar} onChange={setAvatar} />
      </div>

      <button
        onClick={() => name.trim() && onNext({ parentName: name.trim(), parentAvatar: avatar })}
        disabled={!name.trim()}
        className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white disabled:opacity-30"
        style={{ background: DARK }}
      >
        Continue →
      </button>
    </div>
  );
}

// Step 3 — Invite spouse
// Note: we only collect the email here. The actual invite is sent server-side
// during signup (completeOnboarding) once we have a valid familyId + token.
function StepInvitePartner({ onNext }) {
  const [email, setEmail] = useState('');

  return (
    <div>
      <div className="text-2xl font-extrabold tracking-tight mb-1">Invite your spouse</div>
      <div className="text-sm text-gray-400 mb-6">
        They'll get their own login and share your family hub in real time
      </div>

      <div className="space-y-3 mb-5">
        <input
          autoFocus
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onNext({ partnerEmail: email.trim() || null })}
          placeholder="Spouse's email address"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
        />
        <button
          onClick={() => onNext({ partnerEmail: email.trim() || null })}
          disabled={!email.trim()}
          className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white disabled:opacity-30"
          style={{ background: DARK }}
        >
          Continue →
        </button>
      </div>

      <button
        onClick={() => onNext({ partnerEmail: null })}
        className="w-full text-sm font-semibold text-gray-500 bg-transparent border-none cursor-pointer py-2 text-center"
      >
        Skip for now
      </button>
    </div>
  );
}

// Step 4 — Add kids
function StepAddKids({ onNext }) {
  const [kids, setKids]             = useState([]);
  const [name, setName]             = useState('');
  const [tier, setTier]             = useState('child');
  const [avatar, setAvatar]         = useState('👦');
  const [birthday, setBirthday]     = useState('');
  const [showPicker, setShowPicker] = useState(false);

  function addKid() {
    const n = name.trim();
    if (!n) return;
    setKids(prev => [...prev, { id: Date.now(), name: n, tier, avatar, birthday: birthday || null }]);
    setName('');
    setTier('child');
    setAvatar('👦');
    setBirthday('');
    setShowPicker(false);
  }

  return (
    <div>
      <div className="text-2xl font-extrabold tracking-tight mb-1">Add your kids</div>
      <div className="text-sm text-gray-400 mb-4">You can always add or edit profiles later</div>

      {kids.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {kids.map(kid => (
            <div key={kid.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <span className="text-xl flex-shrink-0">{kid.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{kid.name}</div>
                {kid.birthday && <div className="text-xs text-gray-400">🎂 {kid.birthday}</div>}
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg capitalize">{kid.tier}</span>
              <button
                onClick={() => setKids(prev => prev.filter(k => k.id !== kid.id))}
                className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none"
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowPicker(p => !p)}
            className={`w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 cursor-pointer border ${showPicker ? 'border-gray-400' : 'border-gray-100'}`}
          >
            {avatar}
          </button>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKid()}
            placeholder="Kid's name"
            className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none font-medium"
          />
          <select
            value={tier}
            onChange={e => setTier(e.target.value)}
            className="bg-gray-50 rounded-lg px-2 py-2 text-xs border-none outline-none cursor-pointer text-gray-700 font-medium"
          >
            <option value="child">Child</option>
            <option value="teen">Teen</option>
          </select>
        </div>
        <input
          type="date"
          value={birthday}
          onChange={e => setBirthday(e.target.value)}
          className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border-none outline-none text-gray-600 mb-2"
        />
        {showPicker && (
          <div className="mt-2 mb-1">
            <AvatarGrid value={avatar} onChange={em => { setAvatar(em); setShowPicker(false); }} />
          </div>
        )}
        <button
          onClick={addKid}
          disabled={!name.trim()}
          className="w-full bg-gray-50 text-gray-600 font-semibold py-2 rounded-lg text-sm border border-gray-200 cursor-pointer disabled:opacity-40"
        >
          + Add Kid
        </button>
      </div>

      <button
        onClick={() => onNext({ kids })}
        className="w-full font-bold py-3.5 rounded-2xl text-sm border-none cursor-pointer text-white"
        style={{ background: DARK }}
      >
        {kids.length > 0 ? "Let's go! →" : 'Skip for now'}
      </button>
    </div>
  );
}

export default function OnboardingFlow() {
  const { completeOnboarding, onboardingData } = useApp();
  const [step, setStep]       = useState(0);
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const TOTAL = 4;

  async function next(stepData) {
    const updated = { ...data, ...stepData };
    setData(updated);
    if (step < TOTAL - 1) {
      setStep(s => s + 1);
    } else {
      setLoading(true);
      setError('');
      try {
        await completeOnboarding(updated);
      } catch (err) {
        setError(err.message || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: GREEN }}>
          <span className="text-2xl">🏠</span>
        </div>
        <div className="text-sm font-semibold text-gray-500">Setting up your hub…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-2">
        {step > 0 ? (
          <button
            onClick={() => setStep(s => s - 1)}
            className="text-sm text-gray-400 bg-transparent border-none cursor-pointer"
          >
            ← Back
          </button>
        ) : (
          <div className="text-sm font-black tracking-tighter">
            <span className="text-gray-900">aera</span><span style={{ color: GREEN }}>mea</span>
          </div>
        )}
      </div>

      <ProgressBar step={step} total={TOTAL} />

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 0 && <StepFamilyName initial={data.familyName} onNext={name => next({ familyName: name })} />}
      {step === 1 && <StepYourProfile initialName={onboardingData?.name} onNext={d => next(d)} />}
      {step === 2 && <StepInvitePartner onNext={d => next(d)} />}
      {step === 3 && <StepAddKids onNext={d => next(d)} />}
    </div>
  );
}
