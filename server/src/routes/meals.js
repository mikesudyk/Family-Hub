const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// ── Meal library ──────────────────────────────────────────────────────────────

router.post('/library', async (req, res) => {
  const { familyId } = req;
  const { title, image, ingredients = [], url, recipe } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const r = await pool.query(
      'INSERT INTO meal_library (family_id, title, photo_url, ingredients, url, recipe) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [familyId, title, image || null, ingredients, url || null, recipe || null]
    );
    const m = r.rows[0];
    const out = { id: m.id, title: m.title, image: m.photo_url, ingredients: m.ingredients || [], url: m.url || null, recipe: m.recipe || null };
    broadcast(familyId, 'meal:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

router.put('/library/:id', async (req, res) => {
  const { familyId } = req;
  const { title, image, ingredients, url, recipe } = req.body;
  try {
    const r = await pool.query(
      `UPDATE meal_library
       SET title       = COALESCE($1, title),
           photo_url   = COALESCE($2, photo_url),
           ingredients = COALESCE($3, ingredients),
           url         = $4,
           recipe      = $5
       WHERE id = $6 AND family_id = $7 RETURNING *`,
      [title, image, ingredients, url || null, recipe || null, req.params.id, familyId]
    );
    const m = r.rows[0];
    const out = { id: m.id, title: m.title, image: m.photo_url, ingredients: m.ingredients || [], url: m.url || null, recipe: m.recipe || null };
    broadcast(familyId, 'meal:updated', out);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

router.delete('/library/:id', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query('DELETE FROM meal_library WHERE id = $1 AND family_id = $2', [req.params.id, familyId]);
    broadcast(familyId, 'meal:deleted', { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// ── Meals on deck ─────────────────────────────────────────────────────────────

router.post('/on-deck', async (req, res) => {
  const { familyId } = req;
  const { title, fromLibrary = false, mealId, ingredients = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const r = await pool.query(
      'INSERT INTO meals_on_deck (family_id, title, from_library, meal_id, ingredients, archived) VALUES ($1,$2,$3,$4,$5,false) RETURNING *',
      [familyId, title, fromLibrary, mealId || null, ingredients]
    );
    const m = r.rows[0];
    const out = { id: m.id, title: m.title, fromLibrary: m.from_library, mealId: m.meal_id, ingredients: m.ingredients || [], archived: false, archivedAt: null };
    broadcast(familyId, 'mealOnDeck:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add meal on deck' });
  }
});

router.put('/on-deck/:id/archive', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'UPDATE meals_on_deck SET archived = true, archived_at = NOW() WHERE id = $1 AND family_id = $2 RETURNING *',
      [req.params.id, familyId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const m = r.rows[0];
    broadcast(familyId, 'mealOnDeck:archived', { id: m.id, archivedAt: m.archived_at });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive meal on deck' });
  }
});

router.delete('/on-deck/:id', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query('DELETE FROM meals_on_deck WHERE id = $1 AND family_id = $2', [req.params.id, familyId]);
    broadcast(familyId, 'mealOnDeck:deleted', { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete meal on deck' });
  }
});

// ── Meal slots (breakfast / lunch / dinner) ───────────────────────────────────

router.put('/slots', async (req, res) => {
  const { familyId } = req;
  const { date, slot, value } = req.body;
  if (!date || !slot) return res.status(400).json({ error: 'date and slot required' });
  try {
    await pool.query(
      `INSERT INTO meal_slots (family_id, date, slot, value) VALUES ($1,$2,$3,$4)
       ON CONFLICT (family_id, date, slot) DO UPDATE SET value = $4`,
      [familyId, date, slot, value || null]
    );
    broadcast(familyId, 'mealSlot:updated', { date, slot, value: value || null });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meal slot' });
  }
});

module.exports = router;
