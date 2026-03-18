const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// ── Shopping lists ────────────────────────────────────────────────────────────

router.post('/lists', async (req, res) => {
  const { familyId } = req;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await pool.query(
      'INSERT INTO shopping_lists (family_id, name) VALUES ($1,$2) RETURNING *',
      [familyId, name]
    );
    const list = { id: r.rows[0].id, name: r.rows[0].name, items: [] };
    broadcast(familyId, 'shoppingList:added', list);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add shopping list' });
  }
});

router.put('/lists/:id', async (req, res) => {
  const { familyId } = req;
  const { name } = req.body;
  try {
    await pool.query(
      'UPDATE shopping_lists SET name = $1 WHERE id = $2 AND family_id = $3',
      [name, req.params.id, familyId]
    );
    broadcast(familyId, 'shoppingList:renamed', { id: Number(req.params.id), name });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename list' });
  }
});

router.delete('/lists/:id', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query('DELETE FROM shopping_lists WHERE id = $1 AND family_id = $2', [req.params.id, familyId]);
    broadcast(familyId, 'shoppingList:deleted', { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// ── Shopping items ────────────────────────────────────────────────────────────

router.post('/lists/:listId/items', async (req, res) => {
  const { familyId } = req;
  const { name, store, url } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await pool.query(
      'INSERT INTO shopping_items (list_id, family_id, name, store, url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.listId, familyId, name, store || null, url || null]
    );
    const i = r.rows[0];
    const out = { id: i.id, listId: Number(req.params.listId), name: i.name, store: i.store, url: i.url, checked: false };
    broadcast(familyId, 'shoppingItem:added', out);
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.put('/lists/:listId/items/:id/toggle', async (req, res) => {
  const { familyId } = req;
  try {
    const r = await pool.query(
      'UPDATE shopping_items SET checked = NOT checked WHERE id = $1 AND family_id = $2 RETURNING *',
      [req.params.id, familyId]
    );
    const i = r.rows[0];
    broadcast(familyId, 'shoppingItem:toggled', { id: i.id, listId: Number(req.params.listId), checked: i.checked });
    res.json({ id: i.id, checked: i.checked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

router.delete('/lists/:listId/items/:id', async (req, res) => {
  const { familyId } = req;
  try {
    await pool.query('DELETE FROM shopping_items WHERE id = $1 AND family_id = $2', [req.params.id, familyId]);
    broadcast(familyId, 'shoppingItem:deleted', { id: Number(req.params.id), listId: Number(req.params.listId) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ── Stores ────────────────────────────────────────────────────────────────────

// PUT /api/shopping/stores — replace the entire stores array
router.put('/stores', async (req, res) => {
  const { familyId } = req;
  const { stores } = req.body; // array of strings
  if (!Array.isArray(stores)) return res.status(400).json({ error: 'stores must be an array' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM stores WHERE family_id = $1', [familyId]);
    for (let i = 0; i < stores.length; i++) {
      await client.query(
        'INSERT INTO stores (family_id, name, sort_order) VALUES ($1,$2,$3)',
        [familyId, stores[i], i]
      );
    }
    await client.query('COMMIT');
    broadcast(familyId, 'stores:updated', { stores });
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update stores' });
  } finally {
    client.release();
  }
});

module.exports = router;
