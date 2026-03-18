import { useApp } from '../context/AppContext';
import { BackButton, UncheckedCircle } from './ui';

export default function MyChoresChild({ memberId }) {
  const { navigate, getMember, getChores, doneCount, toggleChore } = useApp();
  const member = getMember(memberId);
  if (!member) return null;

  const chores = getChores(member.id);
  const done   = doneCount(member.id);

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="hub" />
        <div className="text-xl font-extrabold tracking-tight">{member.avatar} My Chores!</div>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        ⭐ {done} of {chores.length} done — keep going!
      </div>

      <div className="grid grid-cols-2 gap-3">
        {chores.map(c => (
          <button
            key={c.id}
            onClick={() => toggleChore(member.id, c.id)}
            className={`flex flex-col items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              c.done
                ? 'bg-green-50 border-green-500'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="text-4xl mb-2">{c.icon}</div>
            <div className="font-bold text-sm mb-1 text-center">{c.name}</div>
            <div className="text-2xl">{c.done ? '✅' : <UncheckedCircle />}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
