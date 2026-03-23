import { useState } from 'react';
import { apiFetch } from '../api/client';
import { BackButton } from './ui';

export default function FeedbackScreen() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'

  async function handleSubmit() {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight">Send Feedback</div>
      </div>

      {status === 'sent' ? (
        <div className="bg-white rounded-2xl p-6 text-center space-y-2">
          <div className="text-3xl">🙏</div>
          <div className="text-base font-bold text-gray-900">Thanks for your feedback!</div>
          <div className="text-sm text-gray-400">We'll review it and get back to you if needed.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-400">
            Share a bug report, suggestion, or anything on your mind.
          </div>
          <textarea
            autoFocus
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className="w-full bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 border-none outline-none resize-none shadow-none"
            style={{ boxShadow: '0 0 0 1px #f3f4f6' }}
          />
          {status === 'error' && (
            <div className="text-xs text-red-500">Something went wrong — please try again.</div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || status === 'sending'}
            className="w-full bg-gray-900 text-white text-sm font-bold py-3 rounded-2xl border-none cursor-pointer disabled:opacity-40"
          >
            {status === 'sending' ? 'Sending…' : 'Send Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
