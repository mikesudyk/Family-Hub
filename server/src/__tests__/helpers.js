const jwt  = require('jsonwebtoken');
const { pool } = require('../db');

/**
 * Creates a complete test fixture: family, parent user, 2 child members,
 * and a family_settings row. Returns a signed JWT for the parent so tests
 * can call authenticated routes directly.
 *
 * Call this inside a test or beforeEach — never at the module level,
 * because setup.js truncates all tables before each test.
 *
 * @returns {{ familyId, userId, memberId, member2Id, token }}
 */
async function createTestFamily() {
  // Family
  const familyRes = await pool.query(
    "INSERT INTO families (hub_name) VALUES ('Test Family') RETURNING id"
  );
  const familyId = familyRes.rows[0].id;

  // Parent user (password_hash is never verified in these tests — any string works)
  const userRes = await pool.query(
    `INSERT INTO users (family_id, email, password_hash, name)
     VALUES ($1, 'test@test.com', 'test-hash', 'Test Parent') RETURNING id`,
    [familyId]
  );
  const userId = userRes.rows[0].id;

  // Child 1
  const member1Res = await pool.query(
    `INSERT INTO family_members (family_id, name, role, tier)
     VALUES ($1, 'Test Kid', 'child', 'child') RETURNING id`,
    [familyId]
  );
  const memberId = member1Res.rows[0].id;

  // Child 2
  const member2Res = await pool.query(
    `INSERT INTO family_members (family_id, name, role, tier)
     VALUES ($1, 'Test Kid 2', 'child', 'child') RETURNING id`,
    [familyId]
  );
  const member2Id = member2Res.rows[0].id;

  // Family settings row — required by routes that UPDATE family_settings
  await pool.query(
    'INSERT INTO family_settings (family_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [familyId]
  );

  // JWT for the parent — same payload shape that verifyToken reads
  const token = jwt.sign(
    { userId, familyId, memberId: null },
    process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod',
    { expiresIn: '1h' }
  );

  return { familyId, userId, memberId, member2Id, token };
}

module.exports = { createTestFamily };
