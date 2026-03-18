const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// POST /api/chores  — add a chore to a member
router.post('/', async (req, res) => {
  const { familyId } = req;
  const { memberId, name, icon = '✅', time = 'Any', repeat = null } = req.body;
  if (!memberId || !name) return res.status(400).json({ error: 'memberId and name required' });
  try {
    const r = await pool.query(
      'INSERT INTO chores (family_id, member_id, name, icon, time, repeat) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [familyId, memberId, name, icon, time, repeat]
    );
    const c = r.rows[0];
    const out = { id: c.id, memberId: c.member_id, name: c.name, icon: c.icon, time: c.time, done: false, repeat: c.repeat };
    broadcast(familyId, 'chore:added', out);
    res.status(201).json(out);
  } catch (err) {
    console.error('[POST /chores]', err);
    res.status(500).json({ error: 'Failed to add chore' });
  }
});

// PUT /api/chores/:id/toggle
router.put('/:id/toggle', async (req, res) => {
  const { familyId } = req;
  const { id } = req.params;
  try {
    const r = await pool.query(
      `UPDATE chores SET done = NOT done, done_at = CASE WHEN NOT done THEN 'just now' ELSE NULL END
       WHERE id = $1 AND family_id = $2 RETURNING *`,
      [id, familyId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Chore not found' });
    const c = r.rows[0];
    const out = { id: c.id, memberId: c.member_id, done: c.done, doneAt: c.done_at };
    broadcast(familyId, 'chore:toggled', out);
    res.json(out);
  } catch (err) {
    console.error('[PUT /chores/:id/toggle]', err);
    res.status(500).json({ error: 'Failed to toggle chore' });
  }
});

// DELETE /api/chores/:id
router.delete('/:id', async (req, res) => {
  const { familyId } = req;
  const { id } = req.params;
  try {
    const r = await pool.query(
      'DELETE FROM chores WHERE id = $1 AND family_id = $2 RETURNING member_id',
      [id, familyId]
    );
    broadcast(familyId, 'chore:deleted', { id: Number(id), memberId: r.rows[0]?.member_id });
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /chores/:id]', err);
    res.status(500).json({ error: 'Failed to delete chore' });
  }
});

// POST /api/chores/assign-list — assign a chore list to multiple members
router.post('/assign-list', async (req, res) => {
  const { familyId } = req;
  const { listId, listName, assignments } = req.body;
  // assignments: [{ kidId, name, icon }]
  if (!listId || !listName || !assignments?.length) {
    return res.status(400).json({ error: 'listId, listName, and assignments required' });
  }
  const eventId = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (let i = 0; i < assignments.length; i++) {
      const { kidId, name, icon } = assignments[i];
      const r = await client.query(
        'INSERT INTO chores (family_id, member_id, name, icon, time, list_event_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [familyId, kidId, name, icon, 'Any', eventId]
      );
      inserted.push(r.rows[0]);
    }
    // Store active list event in settings
    await client.query(
      'UPDATE family_settings SET active_list_event = $1 WHERE family_id = $2',
      [JSON.stringify({ id: eventId, name: listName, listId }), familyId]
    );
    await client.query('COMMIT');
    broadcast(familyId, 'list:assigned', { eventId, listName, listId, chores: inserted });
    res.status(201).json({ eventId, chores: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /chores/assign-list]', err);
    res.status(500).json({ error: 'Failed to assign list' });
  } finally {
    client.release();
  }
});

// DELETE /api/chores/dismiss-list — clear active list event banner
router.delete('/dismiss-list', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query(
      'UPDATE family_settings SET active_list_event = NULL WHERE family_id = $1',
      [familyId]
    );
    broadcast(familyId, 'list:dismissed', {});
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /chores/dismiss-list]', err);
    res.status(500).json({ error: 'Failed to dismiss list' });
  }
});

// ── Chore lists ───────────────────────────────────────────────────────────────

// POST /api/chores/lists
router.post('/lists', async (req, res) => {
  const { familyId } = req;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await pool.query(
      'INSERT INTO chore_lists (family_id, name) VALUES ($1,$2) RETURNING *',
      [familyId, name]
    );
    const list = { id: r.rows[0].id, name: r.rows[0].name, chores: [] };
    broadcast(familyId, 'choreList:added', list);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chore list' });
  }
});

// PUT /api/chores/lists/:id
router.put('/lists/:id', async (req, res) => {
  const { familyId } = req;
  const { name } = req.body;
  try {
    await pool.query(
      'UPDATE chore_lists SET name = $1 WHERE id = $2 AND family_id = $3',
      [name, req.params.id, familyId]
    );
    broadcast(familyId, 'choreList:renamed', { id: Number(req.params.id), name });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename chore list' });
  }
});

// DELETE /api/chores/lists/:id
router.delete('/lists/:id', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query('DELETE FROM chore_lists WHERE id = $1 AND family_id = $2', [req.params.id, familyId]);
    broadcast(familyId, 'choreList:deleted', { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chore list' });
  }
});

// POST /api/chores/lists/:id/items
router.post('/lists/:id/items', async (req, res) => {
  const { familyId } = req;
  const { name, icon = '✅' } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO chore_list_items (chore_list_id, name, icon) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, name, icon]
    );
    const item = { id: r.rows[0].id, listId: Number(req.params.id), name: r.rows[0].name, icon: r.rows[0].icon };
    broadcast(familyId, 'choreListItem:added', item);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// DELETE /api/chores/lists/:listId/items/:itemId
router.delete('/lists/:listId/items/:itemId', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query('DELETE FROM chore_list_items WHERE id = $1', [req.params.itemId]);
    broadcast(familyId, 'choreListItem:deleted', {
      listId: Number(req.params.listId), itemId: Number(req.params.itemId),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
