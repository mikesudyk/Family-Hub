import { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, SectionLabel, MenuRow } from './ui';

export default function AdminDashboard() {
  const { navigate, hubName, setHubName, bgImage, setBgImage, signOut } = useApp();
  const fileInputRef = useRef(null);

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="hub" />
        <div className="text-xl font-extrabold tracking-tight">Admin Dashboard</div>
      </div>

      <SectionLabel>Background Image</SectionLabel>
      <div className="flex items-center gap-3 mb-5">
        {bgImage && (
          <div
            className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0 border border-gray-100"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        )}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current.click()}
            className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-xl border-none cursor-pointer"
          >
            {bgImage ? 'Change Image' : 'Upload Image'}
          </button>
          {!bgImage && (
            <button
              onClick={() => setBgImage('/default-bg.jpeg')}
              className="text-sm font-semibold bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border-none cursor-pointer"
            >
              Use default
            </button>
          )}
          {bgImage && (
            <button
              onClick={() => setBgImage(null)}
              className="text-sm font-semibold bg-gray-100 text-gray-600 px-4 py-2 rounded-xl border-none cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <SectionLabel>Hub Name</SectionLabel>
      <input
        type="text"
        value={hubName}
        onChange={e => setHubName(e.target.value)}
        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 border-none outline-none mb-5"
        placeholder="e.g. Sudyk Hub"
      />

      <SectionLabel>Manage</SectionLabel>
      <MenuRow onClick={() => navigate('admin-profiles')}>
        <span>👨‍👩‍👧‍👦 Manage Profiles</span><span>›</span>
      </MenuRow>
      <div className="flex items-center justify-between px-4 py-3 mb-1 rounded-xl bg-gray-50 opacity-50">
        <span className="text-sm font-semibold text-gray-900">📋 Chore Builder</span>
        <span className="text-xs font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Coming soon</span>
      </div>
      <MenuRow onClick={() => navigate('admin-assignments')}>
        <span>📌 Chore Assignments</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={() => navigate('admin-chore-lists')}>
        <span>📝 Chore Lists</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={() => navigate('admin-school-goals')}>
        <span>🎯 School Goals</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={() => navigate('admin-countdown')}>
        <span>⏳ Featured Countdown</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={() => navigate('meal-library')}>
        <span>🍽️ Meal Library</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={() => navigate('shopping-lists')}>
        <span>🛒 Shopping Lists</span><span>›</span>
      </MenuRow>

      <SectionLabel>Integrations</SectionLabel>
      <MenuRow onClick={() => navigate('admin-calendars')}>
        <span>📅 Calendar Connections</span><span>›</span>
      </MenuRow>

      <SectionLabel>Account</SectionLabel>
      <MenuRow onClick={() => navigate('design-system')}>
        <span>🎨 Design System</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={() => navigate('feedback')}>
        <span>💬 Send Feedback</span><span>›</span>
      </MenuRow>
      <MenuRow onClick={signOut}>
        <span className="text-red-500">🚪 Sign Out</span><span>›</span>
      </MenuRow>
    </div>
  );
}
