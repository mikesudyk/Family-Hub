const express        = require('express');
const { pool }       = require('../db');
const { broadcast }  = require('../socket');

const router = express.Router();

// PUT /api/settings — update hub name and/or any settings field
router.put('/', async (req, res) => {
  const { familyId } = req;
  const { hubName, countdownName, countdownDate, countdownMode, bgImage, printMode } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (hubName !== undefined) {
      await client.query('UPDATE families SET hub_name = $1 WHERE id = $2', [hubName, familyId]);
    }

    await client.query(
      `UPDATE family_settings
       SET countdown_name = COALESCE($1, countdown_name),
           countdown_date = COALESCE($2::date, countdown_date),
           countdown_mode = COALESCE($3, countdown_mode),
           bg_image       = COALESCE($4, bg_image),
           print_mode     = COALESCE($5, print_mode)
       WHERE family_id = $6`,
      [countdownName, countdownDate || null, countdownMode, bgImage, printMode, familyId]
    );

    await client.query('COMMIT');

    const update = { hubName, countdownName, countdownDate, countdownMode, bgImage, printMode };
    broadcast(familyId, 'settings:updated', update);
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PUT /settings]', err);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

module.exports = router;
