const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const nodemailer = require('nodemailer');
const { pool }  = require('../db');

const router = express.Router();

const DEFAULT_STORES = ["Sam's", 'Costco', 'Meijer', 'Aldi', "Trader Joe's", 'Wal-Mart'];

function makeToken(userId, familyId, memberId) {
  return jwt.sign(
    { userId, familyId, memberId },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
// Creates account + family + seeds default data
router.post('/signup', async (req, res) => {
  const { name, email, password, familyName, parentAvatar = '👨', kids = [], partnerEmail } = req.body;
  if (!name || !email || !password || !familyName) {
    return res.status(400).json({ error: 'name, email, password, and familyName are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check email not taken
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    // Create family
    const familyRes = await client.query(
      'INSERT INTO families (hub_name) VALUES ($1) RETURNING id',
      [familyName + ' Hub']
    );
    const familyId = familyRes.rows[0].id;

    // Hash password + create user
    const hash = await bcrypt.hash(password, 12);
    const userRes = await client.query(
      'INSERT INTO users (family_id, email, password_hash, name, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [familyId, email.toLowerCase(), hash, name, parentAvatar]
    );
    const userId = userRes.rows[0].id;

    // Create parent family_member record
    const memberRes = await client.query(
      'INSERT INTO family_members (family_id, user_id, name, avatar, role, tier, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [familyId, userId, name, parentAvatar, 'admin', 'admin', 0]
    );
    const memberId = memberRes.rows[0].id;

    // Create family_settings
    await client.query(
      'INSERT INTO family_settings (family_id, countdown_mode) VALUES ($1, $2)',
      [familyId, 'birthday']
    );

    // Seed default stores
    for (let i = 0; i < DEFAULT_STORES.length; i++) {
      await client.query(
        'INSERT INTO stores (family_id, name, sort_order) VALUES ($1,$2,$3)',
        [familyId, DEFAULT_STORES[i], i]
      );
    }

    // Seed default grocery shopping list
    await client.query(
      'INSERT INTO shopping_lists (family_id, name) VALUES ($1, $2)',
      [familyId, 'Grocery']
    );

    // Add kids if provided
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      await client.query(
        'INSERT INTO family_members (family_id, name, avatar, role, tier, birthday, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [familyId, kid.name, kid.avatar || '👦', 'child', kid.tier || 'child', kid.birthday || null, i + 1]
      );
    }

    await client.query('COMMIT');

    // Send partner invite if provided
    let inviteUrl = null;
    if (partnerEmail) {
      try {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        await pool.query(
          'INSERT INTO invites (family_id, email, token) VALUES ($1,$2,$3)',
          [familyId, partnerEmail.toLowerCase(), inviteToken]
        );
        inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${inviteToken}`;

        if (process.env.EMAIL_HOST) {
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 587,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          });
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@aeramea.com',
            to: partnerEmail,
            subject: "You've been invited to join a family hub on Aeramea",
            html: `<p>You've been invited to join a family hub on <strong>Aeramea</strong>.</p>
                   <p><a href="${inviteUrl}">Click here to accept your invite</a></p>
                   <p>This link expires in 7 days.</p>`,
          });
        } else {
          console.log(`[invite] No EMAIL_HOST set. Invite link for ${partnerEmail}: ${inviteUrl}`);
        }
      } catch (inviteErr) {
        console.error('[signup invite]', inviteErr.message);
        // Non-fatal — account was created successfully
      }
    }

    const token = makeToken(userId, familyId, memberId);
    res.status(201).json({ token, userId, familyId, memberId, inviteUrl });
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
    res.json({ token, userId: user.id, familyId: user.family_id, memberId: user.member_id });
  } catch (err) {
    console.error('[signin]', err);
    res.status(500).json({ error: 'Sign in failed' });
  }
});

// ── POST /api/auth/invite ─────────────────────────────────────────────────────
// Authenticated — sends a partner invite email
router.post('/invite', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
  let familyId;
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    familyId = payload.familyId;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO invites (family_id, email, token) VALUES ($1,$2,$3)',
      [familyId, email.toLowerCase(), token]
    );

    const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;

    // Send email (falls back to console log if SMTP not configured)
    if (process.env.EMAIL_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@aeramea.com',
        to: email,
        subject: "You've been invited to join a family hub on Aeramea",
        html: `<p>You've been invited to join a family hub on <strong>Aeramea</strong>.</p>
               <p><a href="${inviteUrl}">Click here to accept your invite</a></p>
               <p>This link expires in 7 days.</p>`,
      });
    } else {
      console.log(`[invite] Link for ${email}: ${inviteUrl}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[invite]', err);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// ── POST /api/auth/join/:token ────────────────────────────────────────────────
// Join an existing family via invite token
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

    // Check email not already taken
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
    res.status(201).json({ token: jwtToken, userId, familyId: invite.family_id, memberId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[join]', err);
    res.status(500).json({ error: 'Failed to join family' });
  } finally {
    client.release();
  }
});

module.exports = router;
