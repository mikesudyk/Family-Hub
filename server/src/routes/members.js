const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// POST /api/members
router.post('/', async (req, res) => {
  const { familyId } = req;
  const { name, avatar = '👦', role = 'child', tier = 'child', birthday } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const r = await pool.query(
      'INSERT INTO family_members (family_id, name, avatar, role, tier, birthday) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [familyId, name, avatar, role, tier, birthday || null]
    );
    const member = r.rows[0];
    const out = { id: member.id, name: member.name, avatar: member.avatar, role: member.role, tier: member.tier, birthday: member.birthday };
    broadcast(familyId, 'member:added', out);
    res.status(201).json(out);
  } catch (err) {
    console.error('[POST /members]', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// PUT /api/members/:id
router.put('/:id', async (req, res) => {
  const { familyId } = req;
  const { id } = req.params;
  const { name, avatar, tier, birthday } = req.body;
  try {
    const r = await pool.query(
      `UPDATE family_members
       SET name     = COALESCE($1, name),
           avatar   = COALESCE($2, avatar),
           tier     = COALESCE($3, tier),
           birthday = COALESCE($4, birthday)
       WHERE id = $5 AND family_id = $6
       RETURNING *`,
      [name, avatar, tier, birthday || null, id, familyId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Member not found' });
    const m = r.rows[0];
    const out = { id: m.id, name: m.name, avatar: m.avatar, role: m.role, tier: m.tier, birthday: m.birthday };
    broadcast(familyId, 'member:updated', out);
    res.json(out);
  } catch (err) {
    console.error('[PUT /members/:id]', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
  const { familyId } = req;
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM family_members WHERE id = $1 AND family_id = $2', [id, familyId]);
    broadcast(familyId, 'member:deleted', { id: Number(id) });
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /members/:id]', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;
