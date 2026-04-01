import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { beforeAll, beforeEach, afterAll } from 'vitest';
import { pool, runMigrations } from '../db.js';

// Run all migrations once before the test suite.
// Migrations use CREATE TABLE IF NOT EXISTS so this is safe to call repeatedly.
beforeAll(async () => {
  await runMigrations();
});

// Wipe all data between tests.
// TRUNCATE families CASCADE removes every child row across all tables
// in a single statement, regardless of insertion order.
beforeEach(async () => {
  await pool.query('TRUNCATE families RESTART IDENTITY CASCADE');
});

// Close the shared pg pool so the process exits cleanly after tests.
afterAll(async () => {
  await pool.end();
});

/**
 * Creates a minimal family + user + member and returns a signed JWT
 * that satisfies verifyToken middleware.
 *
 * Usage:
 *   const { token, familyId, memberId, userId } = await createTestContext();
 *   request(app).post('/api/chores').set('Authorization', `Bearer ${token}`)
 */
export async function createTestContext({ memberName = 'Test Parent', role = 'admin', tier = 'admin' } = {}) {
  // 1. Family
  const familyRes = await pool.query(
    "INSERT INTO families (hub_name) VALUES ('Test Hub') RETURNING id"
  );
  const familyId = familyRes.rows[0].id;

  // 2. User (parent login)
  const passwordHash = await bcrypt.hash('test-password', 1); // cost 1 = fast in tests
  const userRes = await pool.query(
    `INSERT INTO users (family_id, email, password_hash, name)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [familyId, 'test@example.com', passwordHash, memberName]
  );
  const userId = userRes.rows[0].id;

  // 3. Family member (links user to family, gives the member an integer id)
  const memberRes = await pool.query(
    `INSERT INTO family_members (family_id, user_id, name, role, tier)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [familyId, userId, memberName, role, tier]
  );
  const memberId = memberRes.rows[0].id;

  // 4. Family settings row (required by some routes that UPDATE family_settings)
  await pool.query(
    'INSERT INTO family_settings (family_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [familyId]
  );

  // 5. JWT — same shape that verifyToken expects
  const token = jwt.sign(
    { userId, familyId, memberId },
    process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod',
    { expiresIn: '1h' }
  );

  return { token, familyId, memberId, userId };
}
