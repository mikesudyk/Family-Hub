import { useApp } from '../context/AppContext';
import { BackButton, GreenButton } from './ui';

export default function ChoreDetail({ choreId, memberId }) {
  const { navigate, getMember, getChores, toggleChore } = useApp();
  const member = getMember(memberId);
  const chore  = getChores(memberId).find(c => c.id === choreId);
  if (!member || !chore) return null;

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="child-profile" data={member.id} />
        <div className="text-xl font-extrabold tracking-tight">Chore Detail</div>
      </div>

      <div className="text-center py-6">
        <div className="text-7xl mb-3">{chore.icon}</div>
        <div className="text-2xl font-bold mb-1">{chore.name}</div>
        <div className="text-sm text-gray-500">
          {chore.time} · {chore.fixed ? `Assigned to ${member.name}` : 'Shared pool'}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 mb-6 text-sm text-gray-700">
        <strong>Instructions:</strong> Complete this chore fully before marking done. Ask a parent if you need help.
      </div>

      {chore.done ? (
        <div className="space-y-3">
          <div className="bg-green-50 rounded-xl p-4 text-center text-green-700 font-bold text-base">
            ✅ Completed {chore.doneAt || 'just now'}
          </div>
          <button
            onClick={() => {
              toggleChore(member.id, chore.id);
              navigate('child-profile', member.id);
            }}
            className="w-full bg-gray-100 text-gray-600 font-semibold text-sm rounded-xl py-3 border-none cursor-pointer"
          >
            Undo — mark as not done
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <GreenButton
            onClick={() => {
              toggleChore(member.id, chore.id);
              navigate('child-profile', member.id);
            }}
          >
            Mark Done ✓
          </GreenButton>
          <button
            onClick={() => navigate('child-profile', member.id)}
            className="w-full bg-gray-100 text-gray-600 font-semibold text-sm rounded-xl py-3 border-none cursor-pointer"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
