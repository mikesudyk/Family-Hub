const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');
const { pushEventToGoogle, deleteEventFromGoogle } = require('../services/googleCalendar');
const { pushEventToIcloud, deleteEventFromIcloud } = require('../services/icloudCalendar');

const router = express.Router();

// Get all calendar connections for this family — used to push events
async function getConnections(familyId) {
  const r = await pool.query(
    'SELECT * FROM calendar_connections WHERE family_id=$1',
    [familyId]
  );
  return r.rows;
}

async function pushEventToAll(connections, event) {
  for (const conn of connections) {
    if (conn.provider === 'google') pushEventToGoogle(conn, event).catch(console.error);
    if (conn.provider === 'icloud') pushEventToIcloud(conn, event).catch(console.error);
  }
}

router.post('/', async (req, res) => {
  const { familyId } = req;
  const { date, title, time, color = 'gray', icon = '📅', notes, url } = req.body;
  if (!date || !title) return res.status(400).json({ error: 'date and title required' });
  try {
    const r = await pool.query(
      'INSERT INTO calendar_events (family_id, date, title, time, color, icon, notes, url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [familyId, date, title, time, color, icon, notes || null, url || null]
    );
    const e = r.rows[0];
    const out = { id: e.id, date: e.date.toISOString().split('T')[0], title: e.title, time: e.time, endTime: e.end_time || null, color: e.color, icon: e.icon, notes: e.notes || null, url: e.url || null };
    broadcast(familyId, 'calendarEvent:added', out);
    getConnections(familyId).then(conns => pushEventToAll(conns, out));

    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add event' });
  }
});

router.put('/:id', async (req, res) => {
  const { familyId } = req;
  const { title, date, time, notes, url } = req.body;
  try {
    const r = await pool.query(
      `UPDATE calendar_events
       SET title = COALESCE($1, title),
           date  = COALESCE($2, date),
           time  = COALESCE($3, time),
           notes = $4,
           url   = $5
       WHERE id = $6 AND family_id = $7 RETURNING *`,
      [title, date, time, notes ?? null, url ?? null, req.params.id, familyId]
    );
    const e = r.rows[0];
    const out = { id: e.id, date: e.date.toISOString().split('T')[0], title: e.title, time: e.time, endTime: e.end_time || null, color: e.color, icon: e.icon, notes: e.notes || null, url: e.url || null, external_id: e.external_id, provider: e.provider };
    broadcast(familyId, 'calendarEvent:updated', out);
    getConnections(familyId).then(conns => pushEventToAll(conns, out));

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

    // Delete from connected calendars in background
    const { external_id, provider } = r.rows[0] || {};
    if (external_id) {
      getConnections(familyId).then(conns => {
        const conn = conns.find(c => c.provider === provider);
        if (!conn) return;
        if (provider === 'google') deleteEventFromGoogle(conn, external_id).catch(console.error);
        if (provider === 'icloud') deleteEventFromIcloud(conn, external_id).catch(console.error);
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
