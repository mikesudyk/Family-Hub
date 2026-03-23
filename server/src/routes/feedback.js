const express    = require('express');
const { pool }   = require('../db');
const router     = express.Router();

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });

  const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.userId]);
  const email = userRes.rows[0]?.email || 'unknown';

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[feedback] No RESEND_API_KEY — message:', message);
    return res.json({ ok: true });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Aeramea <noreply@aeramea.com>',
        to: 'mike@aeramea.com',
        subject: 'Aeramea App Feedback',
        html: `<p><strong>Feedback from ${email}:</strong></p>
               <p style="white-space:pre-wrap">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
      }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      console.error('[feedback] Resend error:', r.status, body);
      return res.status(500).json({ error: 'Failed to send feedback' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[feedback]', err);
    res.status(500).json({ error: 'Failed to send feedback' });
  }
});

module.exports = router;
