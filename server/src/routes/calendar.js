const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');
const { pushEventToGoogle, deleteEventFromGoogle } = require('../services/googleCalendar');

const router = express.Router();

// Get Google connection for this family (if any) — used to push events
async function getGoogleConnection(familyId) {
  const r = await pool.query(
    "SELECT * FROM calendar_connections WHERE family_id=$1 AND provider='google' LIMIT 1",
    [familyId]
  );
  return r.rows[0] || null;
}

router.post('/', async (req, res) => {
  const { familyId } = req;
  const { date, title, time, color = 'gray', icon = '📅' } = req.body;
  if (!date || !title) return res.status(400).json({ error: 'date and title required' });
  try {
    const r = await pool.query(
      'INSERT INTO calendar_events (family_id, date, title, time, color, icon) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [familyId, date, title, time, color, icon]
    );
    const e = r.rows[0];
    const out = { id: e.id, date: e.date.toISOString().split('T')[0], title: e.title, time: e.time, color: e.color, icon: e.icon };
    broadcast(familyId, 'calendarEvent:added', out);

    // Push to Google in background
    getGoogleConnection(familyId).then(conn => {
      if (conn) pushEventToGoogle(conn, out).catch(console.error);
    });

    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add event' });
  }
});

router.put('/:id', async (req, res) => {
  const { familyId } = req;
  const { title, date, time } = req.body;
  try {
    const r = await pool.query(
      `UPDATE calendar_events
       SET title = COALESCE($1, title),
           date  = COALESCE($2, date),
           time  = COALESCE($3, time)
       WHERE id = $4 AND family_id = $5 RETURNING *`,
      [title, date, time, req.params.id, familyId]
    );
    const e = r.rows[0];
    const out = { id: e.id, date: e.date.toISOString().split('T')[0], title: e.title, time: e.time, color: e.color, icon: e.icon, external_id: e.external_id, provider: e.provider };
    broadcast(familyId, 'calendarEvent:updated', out);

    // Push to Google in background
    getGoogleConnection(familyId).then(conn => {
      if (conn) pushEventToGoogle(conn, out).catch(console.error);
    });

    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'DELETE FROM calendar_events WHERE id=$1 AND family_id=$2 RETURNING external_id, provider',
      [req.params.id, familyId]
    );
    broadcast(familyId, 'calendarEvent:deleted', { id: Number(req.params.id) });

    // Delete from Google in background
    const { external_id, provider } = r.rows[0] || {};
    if (external_id && provider === 'google') {
      getGoogleConnection(familyId).then(conn => {
        if (conn) deleteEventFromGoogle(conn, external_id).catch(console.error);
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
