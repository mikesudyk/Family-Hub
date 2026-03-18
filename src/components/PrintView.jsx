import { useApp } from '../context/AppContext';
import { BackButton } from './ui';

export default function PrintView({ memberId }) {
  const { navigate, getMember, getChores, printMode, setPrintMode } = useApp();
  const member = getMember(memberId);
  if (!member) return null;

  const chores = getChores(member.id);
  const today  = new Date().toDateString();
  const days   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-4 no-print">
        <BackButton to="child-profile" data={member.id} />
        <div className="text-xl font-extrabold tracking-tight flex-1">Print View</div>
        <button
          onClick={() => window.print()}
          className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm cursor-pointer"
        >
          🖨️ Print
        </button>
      </div>

      <div className="flex gap-2 mb-4 no-print">
        {['day', 'week'].map(m => (
          <button
            key={m}
            onClick={() => setPrintMode(m)}
            className={`px-4 py-2 rounded-lg border-none cursor-pointer font-semibold text-sm capitalize ${
              printMode === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {m === 'day' ? 'Day' : 'Week'}
          </button>
        ))}
      </div>

      <div className="border-2 border-gray-900 rounded-xl p-5">
        <div className="text-center mb-4">
          <div className="text-xl font-black">{member.name}'s Chores</div>
          <div className="text-sm text-gray-500">
            {printMode === 'day' ? today : `Week of ${today}`}
          </div>
        </div>

        {printMode === 'day' ? (
          chores.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: '1px solid #e5e7eb' }}
            >
              <div className="w-6 h-6 border-2 border-gray-700 rounded flex-shrink-0" />
              <div className="text-xl">{c.icon}</div>
              <div className="font-semibold flex-1">{c.name}</div>
              <div className="text-xs text-gray-400">{c.time}</div>
            </div>
          ))
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-1" style={{ borderBottom: '2px solid #111' }}>Chore</th>
                {days.map(d => (
                  <th key={d} className="py-1.5 px-1 text-center" style={{ borderBottom: '2px solid #111' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chores.map(c => (
                <tr key={c.id}>
                  <td className="py-2 px-1" style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {c.icon} {c.name}
                  </td>
                  {days.map(d => (
                    <td key={d} className="py-2 px-1 text-center" style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <div className="w-4 h-4 border border-gray-600 rounded mx-auto" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
