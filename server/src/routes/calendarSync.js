const express  = require('express');
const { pool } = require('../db');
const { verifyToken } = require('../middleware/auth');
const {
  getAuthUrl, exchangeCode,
  syncFromGoogle, registerWebhook,
} = require('../services/googleCalendar');
const {
  discoverCalendars, syncFromIcloud,
} = require('../services/icloudCalendar');

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── GET /api/calendar/connect/google ─────────────────────────────────────────
// Initiates Google OAuth — browser navigates here directly; cookie is sent automatically
router.get('/connect/google', verifyToken, (req, res) => {
  const state = Buffer.from(JSON.stringify({
    memberId: req.memberId,
    familyId: req.familyId,
  })).toString('base64');

  res.redirect(getAuthUrl(state));
});

// ── GET /api/calendar/callback/google ─────────────────────────────────────────
// Google redirects here after user authorises
router.get('/callback/google', async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect(`${CLIENT_URL}?calendarError=google`);
  }

  let memberId, familyId;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    memberId = decoded.memberId;
    familyId = decoded.familyId;
  } catch {
    return res.redirect(`${CLIENT_URL}?calendarError=google`);
  }

  try {
    const tokens = await exchangeCode(code);

    // Upsert connection record
    const r = await pool.query(
      `INSERT INTO calendar_connections
         (family_id, member_id, provider, access_token, refresh_token, expires_at)
       VALUES ($1,$2,'google',$3,$4,$5)
       ON CONFLICT (member_id, provider)
       DO UPDATE SET access_token=$3, refresh_token=COALESCE($4, calendar_connections.refresh_token),
                     expires_at=$5, sync_token=NULL
       RETURNING *`,
      [familyId, memberId, tokens.access_token, tokens.refresh_token,
       tokens.expiry_date ? new Date(tokens.expiry_date) : null]
    );
    const connection = r.rows[0];

    // Initial sync + webhook in background
    syncFromGoogle(connection).catch(console.error);
    registerWebhook(connection).catch(console.error);

    res.redirect(`${CLIENT_URL}?connected=google`);
  } catch (err) {
    console.error('[google callback]', err);
    res.redirect(`${CLIENT_URL}?calendarError=google`);
  }
});

// ── POST /api/calendar/webhook/google ─────────────────────────────────────────
// Google pushes here when calendar changes
router.post('/webhook/google', async (req, res) => {
  res.sendStatus(200); // acknowledge immediately

  const channelId = req.headers['x-goog-channel-id'];
  if (!channelId) return;

  try {
    const r = await pool.query(
      'SELECT * FROM calendar_connections WHERE webhook_channel_id=$1', [channelId]
    );
    if (r.rows[0]) {
      await syncFromGoogle(r.rows[0]);
    }
  } catch (err) {
    console.error('[google webhook]', err);
  }
});

// ── GET /api/calendar/connections ─────────────────────────────────────────────
router.get('/connections', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT provider, calendar_id, created_at,
              (access_token IS NOT NULL) as connected
       FROM calendar_connections WHERE family_id=$1`,
      [req.familyId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load connections' });
  }
});

// ── POST /api/calendar/connect/icloud/discover ────────────────────────────────
// Returns list of calendars for given credentials (before saving the connection)
router.post('/connect/icloud/discover', verifyToken, async (req, res) => {
  const { appleId, appPassword } = req.body;
  if (!appleId || !appPassword) return res.status(400).json({ error: 'appleId and appPassword required' });
  try {
    const calendars = await discoverCalendars(appleId, appPassword);
    res.json({ calendars });
  } catch (err) {
    console.error('[icloud discover]', err.message);
    res.status(400).json({ error: err.message || 'Could not connect to iCloud Calendar' });
  }
});

// ── POST /api/calendar/connect/icloud ─────────────────────────────────────────
// Save iCloud credentials + chosen calendar, trigger initial sync
router.post('/connect/icloud', verifyToken, async (req, res) => {
  const { appleId, appPassword, calendarUrl, calendarName } = req.body;
  if (!appleId || !appPassword || !calendarUrl) {
    return res.status(400).json({ error: 'appleId, appPassword, and calendarUrl required' });
  }
  try {
    // Ensure calendarUrl ends with / for correct event URL construction
    const normalizedUrl = calendarUrl.endsWith('/') ? calendarUrl : calendarUrl + '/';

    const r = await pool.query(
      `INSERT INTO calendar_connections
         (family_id, member_id, provider, access_token, refresh_token, calendar_id)
       VALUES ($1,$2,'icloud',$3,$4,$5)
       ON CONFLICT (member_id, provider)
       DO UPDATE SET access_token=$3, refresh_token=$4, calendar_id=$5
       RETURNING *`,
      [req.familyId, req.memberId, appleId, appPassword, normalizedUrl]
    );

    // Await the initial sync so events are in DB before the client refreshes
    try {
      const { synced } = await syncFromIcloud(r.rows[0]);
      console.log(`[icloud connect] initial sync: ${synced} events`);
    } catch (err) {
      console.error('[icloud initial sync]', err.message);
      // Don't fail the connection just because sync had trouble
    }

    res.json({ ok: true, calendarName });
  } catch (err) {
    console.error('[icloud connect]', err.message);
    res.status(500).json({ error: 'Failed to save iCloud connection' });
  }
});

// ── DELETE /api/calendar/connections/icloud ────────────────────────────────────
// (handled by the existing generic DELETE below)

// ── POST /api/calendar/sync ───────────────────────────────────────────────────
// Manual sync trigger
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM calendar_connections WHERE family_id=$1',
      [req.familyId]
    );
    const results = await Promise.all(r.rows.map(c => {
      if (c.provider === 'google') return syncFromGoogle(c);
      if (c.provider === 'icloud') return syncFromIcloud(c);
      return null;
    }));
    res.json({ ok: true, results });
  } catch (err) {
    console.error('[manual sync]', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ── DELETE /api/calendar/connections/:provider ────────────────────────────────
router.delete('/connections/:provider', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM calendar_connections WHERE family_id=$1 AND provider=$2',
      [req.familyId, req.params.provider]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

module.exports = router;
