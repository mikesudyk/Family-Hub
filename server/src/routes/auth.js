const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const { pool }  = require('../db');
const { verifyToken } = require('../middleware/auth');

async function sendInviteEmail(to, inviteUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[invite] No RESEND_API_KEY set. Link for ${to}: ${inviteUrl}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Aeramea <noreply@aeramea.com>',
      to,
      subject: "You've been invited to join a family hub on Aeramea",
      html: `<p>You've been invited to join a family hub on <strong>Aeramea</strong>.</p>
             <p><a href="${inviteUrl}">Click here to accept your invite</a></p>
             <p>This link expires in 7 days.</p>`,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(body)}`);
  }
}

const router = express.Router();

const DEFAULT_STORES = ["Sam's", 'Costco', 'Meijer', 'Aldi', "Trader Joe's", 'Wal-Mart'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  // Shared root domain so cookie is sent from aeramea.com → api.aeramea.com
  // Omit domain in dev so localhost works without issue
  ...(process.env.NODE_ENV === 'production' ? { domain: '.aeramea.com' } : {}),
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  path: '/',
};

function makeToken(userId, familyId, memberId) {
  return jwt.sign(
    { userId, familyId, memberId },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('aeramea_token', token, COOKIE_OPTIONS);
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password, familyName, parentAvatar = '👨', kids = [], partnerEmail, betaCode } = req.body;
  if (!name || !email || !password || !familyName) {
    return res.status(400).json({ error: 'name, email, password, and familyName are required' });
  }
  const BETA_CODE = process.env.BETA_CODE || 'mikevip';
  if (!betaCode || betaCode.trim().toLowerCase() !== BETA_CODE.toLowerCase()) {
    return res.status(403).json({ error: 'Invalid beta access code' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const familyRes = await client.query(
      'INSERT INTO families (hub_name) VALUES ($1) RETURNING id',
      [familyName + ' Hub']
    );
    const familyId = familyRes.rows[0].id;

    const hash = await bcrypt.hash(password, 12);
    const userRes = await client.query(
      'INSERT INTO users (family_id, email, password_hash, name, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [familyId, email.toLowerCase(), hash, name, parentAvatar]
    );
    const userId = userRes.rows[0].id;

    const memberRes = await client.query(
      'INSERT INTO family_members (family_id, user_id, name, avatar, role, tier, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [familyId, userId, name, parentAvatar, 'admin', 'admin', 0]
    );
    const memberId = memberRes.rows[0].id;

    await client.query(
      'INSERT INTO family_settings (family_id, countdown_mode) VALUES ($1, $2)',
      [familyId, 'birthday']
    );

    for (let i = 0; i < DEFAULT_STORES.length; i++) {
      await client.query(
        'INSERT INTO stores (family_id, name, sort_order) VALUES ($1,$2,$3)',
        [familyId, DEFAULT_STORES[i], i]
      );
    }

    await client.query(
      'INSERT INTO shopping_lists (family_id, name) VALUES ($1, $2)',
      [familyId, 'Grocery']
    );

    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      await client.query(
        'INSERT INTO family_members (family_id, name, avatar, role, tier, birthday, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [familyId, kid.name, kid.avatar || '👦', 'child', kid.tier || 'child', kid.birthday || null, i + 1]
      );
    }

    await client.query('COMMIT');

    let inviteUrl = null;
    if (partnerEmail) {
      try {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        await pool.query(
          'INSERT INTO invites (family_id, email, token) VALUES ($1,$2,$3)',
          [familyId, partnerEmail.toLowerCase(), inviteToken]
        );
        inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
        sendInviteEmail(partnerEmail, inviteUrl).catch(err => console.error('[signup invite]', err.message));
      } catch (inviteErr) {
        console.error('[signup invite]', inviteErr.message);
      }
    }

    const token = makeToken(userId, familyId, memberId);
    setAuthCookie(res, token);
    res.status(201).json({ userId, familyId, memberId, inviteUrl: process.env.RESEND_API_KEY ? null : inviteUrl });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[signup]', err);
    res.status(500).json({ error: 'Signup failed' });
  } finally {
    client.release();
  }
});

// ── POST /api/auth/signin ─────────────────────────────────────────────────────
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const userRes = await pool.query(
      'SELECT u.*, fm.id as member_id FROM users u JOIN family_members fm ON fm.user_id = u.id WHERE u.email = $1',
      [email.toLowerCase()]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = makeToken(user.id, user.family_id, user.member_id);
    setAuthCookie(res, token);
    res.json({ userId: user.id, familyId: user.family_id, memberId: user.member_id });
  } catch (err) {
    console.error('[signin]', err);
    res.status(500).json({ error: 'Sign in failed' });
  }
});

// ── POST /api/auth/signout ────────────────────────────────────────────────────
router.post('/signout', (req, res) => {
  res.clearCookie('aeramea_token', {
    path: '/',
    ...(process.env.NODE_ENV === 'production' ? { domain: '.aeramea.com' } : {}),
  });
  res.json({ ok: true });
});

// ── POST /api/auth/join/:token ────────────────────────────────────────────────
router.post('/join/:token', async (req, res) => {
  const { token } = req.params;
  const { name, password, avatar = '👩' } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'name and password required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inviteRes = await client.query(
      'SELECT * FROM invites WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    const invite = inviteRes.rows[0];
    if (!invite) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invite link is invalid or has expired' });
    }

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [invite.email]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const userRes = await client.query(
      'INSERT INTO users (family_id, email, password_hash, name, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [invite.family_id, invite.email, hash, name, avatar]
    );
    const userId = userRes.rows[0].id;

    const memberRes = await client.query(
      'INSERT INTO family_members (family_id, user_id, name, avatar, role, tier) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [invite.family_id, userId, name, avatar, 'admin', 'admin']
    );
    const memberId = memberRes.rows[0].id;

    await client.query('UPDATE invites SET used = TRUE WHERE id = $1', [invite.id]);
    await client.query('COMMIT');

    const jwtToken = makeToken(userId, invite.family_id, memberId);
    setAuthCookie(res, jwtToken);
    res.status(201).json({ userId, familyId: invite.family_id, memberId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[join]', err);
    res.status(500).json({ error: 'Failed to join family' });
  } finally {
    client.release();
  }
});

// ── GET /api/auth/invites ─────────────────────────────────────────────────────
router.get('/invites', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, email, created_at, expires_at FROM invites
       WHERE family_id=$1 AND used=false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.familyId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('[invites]', err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// ── POST /api/auth/invite/resend/:id ─────────────────────────────────────────
router.post('/invite/resend/:id', verifyToken, async (req, res) => {
  try {
    const newToken = crypto.randomBytes(32).toString('hex');
    const r = await pool.query(
      `UPDATE invites SET token=$1, created_at=NOW(), expires_at=NOW() + INTERVAL '7 days'
       WHERE id=$2 AND family_id=$3 AND used=false
       RETURNING email, token`,
      [newToken, req.params.id, req.familyId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Invite not found' });
    const { email, token } = r.rows[0];
    const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;
    let emailSent = false;
    try {
      await sendInviteEmail(email, inviteUrl);
      emailSent = true;
    } catch (emailErr) {
      console.error('[resend invite] email failed:', emailErr.message);
    }
    res.json({ ok: true, emailSent, inviteUrl: !emailSent ? inviteUrl : null });
  } catch (err) {
    console.error('[resend invite]', err);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

// ── DELETE /api/auth/invite/:id ───────────────────────────────────────────────
router.delete('/invite/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM invites WHERE id=$1 AND family_id=$2 AND used=false',
      [req.params.id, req.familyId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[delete invite]', err);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

// ── POST /api/auth/invite ─────────────────────────────────────────────────────
router.post('/invite', verifyToken, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO invites (family_id, email, token) VALUES ($1,$2,$3)',
      [req.familyId, email.toLowerCase(), token]
    );

    const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;

    let emailSent = false;
    try {
      await sendInviteEmail(email, inviteUrl);
      emailSent = true;
    } catch (emailErr) {
      console.error('[invite] email failed:', emailErr.message);
    }

    res.json({ ok: true, emailSent, inviteUrl: !emailSent ? inviteUrl : null });
  } catch (err) {
    console.error('[invite]', err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    // Always respond OK to prevent email enumeration
    if (!userRes.rows.length) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO password_resets (email, token) VALUES ($1, $2)',
      [email.toLowerCase(), token]
    );

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${clientUrl}/reset-password/${token}`;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Aeramea <noreply@aeramea.com>',
          to: email,
          subject: 'Reset your Aeramea password',
          html: `<p>You requested a password reset for your Aeramea account.</p>
                 <p><a href="${resetUrl}">Click here to reset your password</a></p>
                 <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        console.error('[forgot-password] Resend error:', body);
      }
    } else {
      console.log(`[forgot-password] No RESEND_API_KEY. Link: ${resetUrl}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// ── POST /api/auth/reset-password/:token ─────────────────────────────────────
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const resetRes = await pool.query(
      'SELECT * FROM password_resets WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    const reset = resetRes.rows[0];
    if (!reset) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, reset.email]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [reset.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── PUT /api/auth/account ─────────────────────────────────────────────────────
router.put('/account', verifyToken, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ error: 'currentPassword required' });
  if (!newEmail && !newPassword) return res.status(400).json({ error: 'Nothing to update' });

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id=$1', [req.userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    if (newEmail) {
      const existing = await pool.query('SELECT id FROM users WHERE email=$1 AND id!=$2', [newEmail.toLowerCase(), req.userId]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });
      await pool.query('UPDATE users SET email=$1 WHERE id=$2', [newEmail.toLowerCase(), req.userId]);
    }

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.userId]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[account update]', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

module.exports = router;
