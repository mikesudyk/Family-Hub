const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// ── Personal to-dos (per member, not day-scoped) ──────────────────────────────

router.post('/personal', async (req, res) => {
  const { familyId } = req;
  const { memberId, text } = req.body;
  if (!memberId || !text) return res.status(400).json({ error: 'memberId and text required' });
  try {
    const r = await pool.query(
      'INSERT INTO personal_todos (family_id, member_id, text) VALUES ($1,$2,$3) RETURNING *',
      [familyId, memberId, text]
    );
    const t = r.rows[0];
    const out = { id: t.id, memberId: t.member_id, text: t.text, done: false };
    broadcast(familyId, 'todo:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add todo' });
  }
});

router.put('/personal/:id/toggle', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'UPDATE personal_todos SET done = NOT done WHERE id = $1 AND family_id = $2 RETURNING *',
      [req.params.id, familyId]
    );
    const t = r.rows[0];
    broadcast(familyId, 'todo:toggled', { id: t.id, memberId: t.member_id, done: t.done });
    res.json({ id: t.id, done: t.done });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle todo' });
  }
});

router.delete('/personal/:id', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'DELETE FROM personal_todos WHERE id = $1 AND family_id = $2 RETURNING member_id',
      [req.params.id, familyId]
    );
    broadcast(familyId, 'todo:deleted', { id: Number(req.params.id), memberId: r.rows[0]?.member_id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// ── Parent priorities (per parent, per day) ───────────────────────────────────

router.post('/priorities', async (req, res) => {
  const { familyId } = req;
  const { memberId, date, text } = req.body;
  if (!memberId || !date || !text) return res.status(400).json({ error: 'memberId, date, text required' });
  try {
    const r = await pool.query(
      'INSERT INTO parent_priorities (family_id, member_id, date, text) VALUES ($1,$2,$3,$4) RETURNING *',
      [familyId, memberId, date, text]
    );
    const p = r.rows[0];
    const out = { id: p.id, memberId: p.member_id, date, text: p.text, done: false };
    broadcast(familyId, 'priority:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add priority' });
  }
});

router.put('/priorities/:id/toggle', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'UPDATE parent_priorities SET done = NOT done WHERE id = $1 AND family_id = $2 RETURNING *',
      [req.params.id, familyId]
    );
    const p = r.rows[0];
    broadcast(familyId, 'priority:toggled', { id: p.id, memberId: p.member_id, date: p.date.toISOString().split('T')[0], done: p.done });
    res.json({ id: p.id, done: p.done });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle priority' });
  }
});

router.delete('/priorities/:id', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'DELETE FROM parent_priorities WHERE id = $1 AND family_id = $2 RETURNING member_id, date',
      [req.params.id, familyId]
    );
    broadcast(familyId, 'priority:deleted', {
      id: Number(req.params.id),
      memberId: r.rows[0]?.member_id,
      date: r.rows[0]?.date?.toISOString().split('T')[0],
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete priority' });
  }
});

module.exports = router;
