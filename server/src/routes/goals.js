const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// ── Personal / school goals ───────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { familyId } = req;
  const { memberId, text, dueDate } = req.body;
  if (!memberId || !text) return res.status(400).json({ error: 'memberId and text required' });
  try {
    const r = await pool.query(
      'INSERT INTO goals (family_id, member_id, text, due_date) VALUES ($1,$2,$3,$4) RETURNING *',
      [familyId, memberId, text, dueDate || null]
    );
    const g = r.rows[0];
    const out = { id: g.id, memberId: g.member_id, text: g.text, dueDate: g.due_date, done: false };
    broadcast(familyId, 'goal:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add goal' });
  }
});

router.put('/:id/toggle', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'UPDATE goals SET done = NOT done WHERE id = $1 AND family_id = $2 RETURNING *',
      [req.params.id, familyId]
    );
    const g = r.rows[0];
    broadcast(familyId, 'goal:toggled', { id: g.id, memberId: g.member_id, done: g.done });
    res.json({ id: g.id, done: g.done });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle goal' });
  }
});

router.put('/:id', async (req, res) => {
  const { familyId } = req;
  const { text, dueDate } = req.body;
  try {
    const r = await pool.query(
      'UPDATE goals SET text = $1, due_date = $2 WHERE id = $3 AND family_id = $4 RETURNING *',
      [text, dueDate || null, req.params.id, familyId]
    );
    const g = r.rows[0];
    const out = { id: g.id, memberId: g.member_id, text: g.text, dueDate: g.due_date, done: g.done };
    broadcast(familyId, 'goal:updated', { memberId: g.member_id, goal: out });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND family_id = $2 RETURNING member_id',
      [req.params.id, familyId]
    );
    broadcast(familyId, 'goal:deleted', { id: Number(req.params.id), memberId: r.rows[0]?.member_id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ── Family goals (daily) ──────────────────────────────────────────────────────

router.post('/family', async (req, res) => {
  const { familyId } = req;
  const { date, text } = req.body;
  if (!date || !text) return res.status(400).json({ error: 'date and text required' });
  try {
    const r = await pool.query(
      'INSERT INTO family_goals (family_id, date, text) VALUES ($1,$2,$3) RETURNING *',
      [familyId, date, text]
    );
    const g = r.rows[0];
    const out = { id: g.id, date, text: g.text, done: false };
    broadcast(familyId, 'familyGoal:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add family goal' });
  }
});

router.put('/family/:id/toggle', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'UPDATE family_goals SET done = NOT done WHERE id = $1 AND family_id = $2 RETURNING *',
      [req.params.id, familyId]
    );
    const g = r.rows[0];
    broadcast(familyId, 'familyGoal:toggled', { id: g.id, date: g.date.toISOString().split('T')[0], done: g.done });
    res.json({ id: g.id, done: g.done });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle family goal' });
  }
});

router.put('/family/:id', async (req, res) => {
  const { familyId } = req;
  const { text } = req.body;
  try {
    const r = await pool.query(
      'UPDATE family_goals SET text = $1 WHERE id = $2 AND family_id = $3 RETURNING *',
      [text, req.params.id, familyId]
    );
    const g = r.rows[0];
    broadcast(familyId, 'familyGoal:updated', { id: g.id, date: g.date.toISOString().split('T')[0], text: g.text });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update family goal' });
  }
});

router.delete('/family/:id', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'DELETE FROM family_goals WHERE id = $1 AND family_id = $2 RETURNING date',
      [req.params.id, familyId]
    );
    broadcast(familyId, 'familyGoal:deleted', { id: Number(req.params.id), date: r.rows[0]?.date?.toISOString().split('T')[0] });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete family goal' });
  }
});

module.exports = router;
