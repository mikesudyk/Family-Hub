const request = require('supertest');
const { describe, it, expect } = require('vitest');
const { app }  = require('../app');
const { pool } = require('../db');
const { createTestFamily } = require('./helpers');

// ─── Helper: create a chore via the API ──────────────────────────────────────
async function createChore(token, memberId, overrides = {}) {
  const res = await request(app)
    .post('/api/chores')
    .set('Authorization', `Bearer ${token}`)
    .send({ memberId, name: 'Clean room', icon: '🧹', ...overrides });
  return res;
}

// ─── 2.1–2.6  POST /api/chores ───────────────────────────────────────────────
describe('POST /api/chores — create', () => {

  // 2.1 One-time chore
  it('creates a one-time chore and returns the correct shape', async () => {
    const { token, memberId } = await createTestFamily();

    const res = await createChore(token, memberId, { name: 'Clean room', icon: '🧹' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id:       expect.any(Number),
      memberId: memberId,
      name:     'Clean room',
      icon:     '🧹',
      time:     'Any',
      done:     false,
      repeat:   null,
    });

    // Verify the row exists in the database
    const dbRow = await pool.query('SELECT * FROM chores WHERE id = $1', [res.body.id]);
    expect(dbRow.rows).toHaveLength(1);
    expect(dbRow.rows[0].name).toBe('Clean room');
  });

  // 2.2 Daily repeating chore
  it('creates a daily repeating chore', async () => {
    const { token, memberId } = await createTestFamily();

    const res = await createChore(token, memberId, { name: 'Make bed', icon: '🛏️', repeat: 'daily' });

    expect(res.status).toBe(201);
    expect(res.body.repeat).toBe('daily');

    // Verify DB value
    const dbRow = await pool.query('SELECT repeat FROM chores WHERE id = $1', [res.body.id]);
    expect(dbRow.rows[0].repeat).toBe('daily');
  });

  // 2.3 Day-array repeat
  it('creates a chore repeating on specific days', async () => {
    const { token, memberId } = await createTestFamily();

    const res = await createChore(token, memberId, {
      name: 'Take out trash', icon: '🗑️', repeat: ['Mon', 'Wed', 'Fri'],
    });

    expect(res.status).toBe(201);
    expect(res.body.repeat).toEqual(['Mon', 'Wed', 'Fri']);

    // DB stores it as a JSON string, not a parsed array
    const dbRow = await pool.query('SELECT repeat FROM chores WHERE id = $1', [res.body.id]);
    expect(dbRow.rows[0].repeat).toBe('["Mon","Wed","Fri"]');
  });

  // 2.4 Biweekly chore
  it('creates a biweekly chore', async () => {
    const { token, memberId } = await createTestFamily();

    const res = await createChore(token, memberId, { name: 'Mow lawn', icon: '🌿', repeat: 'biweekly' });

    expect(res.status).toBe(201);
    expect(res.body.repeat).toBe('biweekly');
  });

  // 2.5 Missing name → 400
  it('rejects a chore without a name', async () => {
    const { token, memberId } = await createTestFamily();

    const res = await request(app)
      .post('/api/chores')
      .set('Authorization', `Bearer ${token}`)
      .send({ memberId });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // 2.6 Missing memberId → 400
  it('rejects a chore without a memberId', async () => {
    const { token } = await createTestFamily();

    const res = await request(app)
      .post('/api/chores')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Clean room' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

});

// ─── 2.7–2.8  PUT /api/chores/:id/toggle ────────────────────────────────────
describe('PUT /api/chores/:id/toggle', () => {

  // 2.7 Toggle done
  it('marks a chore as done', async () => {
    const { token, memberId } = await createTestFamily();
    const created = await createChore(token, memberId);
    const choreId = created.body.id;

    const res = await request(app)
      .put(`/api/chores/${choreId}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);

    // Verify DB: done = true, done_at is set
    const dbRow = await pool.query('SELECT done, done_at FROM chores WHERE id = $1', [choreId]);
    expect(dbRow.rows[0].done).toBe(true);
    expect(dbRow.rows[0].done_at).not.toBeNull();
  });

  // 2.8 Toggle back to not done
  it('toggles a chore back to not done', async () => {
    const { token, memberId } = await createTestFamily();
    const created = await createChore(token, memberId);
    const choreId = created.body.id;

    // Toggle on, then off
    await request(app)
      .put(`/api/chores/${choreId}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .put(`/api/chores/${choreId}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.done).toBe(false);

    // Verify DB: done = false, done_at cleared
    const dbRow = await pool.query('SELECT done, done_at FROM chores WHERE id = $1', [choreId]);
    expect(dbRow.rows[0].done).toBe(false);
    expect(dbRow.rows[0].done_at).toBeNull();
  });

  // 2.11 Nonexistent chore → 404  (grouped here since it's a toggle test)
  it('returns 404 when toggling a nonexistent chore', async () => {
    const { token } = await createTestFamily();

    const res = await request(app)
      .put('/api/chores/99999/toggle')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

});

// ─── 2.9  PUT /api/chores/:id ────────────────────────────────────────────────
describe('PUT /api/chores/:id — update', () => {

  it('updates a chore name, icon, and repeat', async () => {
    const { token, memberId } = await createTestFamily();
    const created = await createChore(token, memberId, { name: 'Clean room' });
    const choreId = created.body.id;

    const res = await request(app)
      .put(`/api/chores/${choreId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Deep clean room', icon: '✨', repeat: 'daily' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id:     choreId,
      name:   'Deep clean room',
      icon:   '✨',
      repeat: 'daily',
    });
  });

});

// ─── 2.10  DELETE /api/chores/:id ────────────────────────────────────────────
describe('DELETE /api/chores/:id', () => {

  it('deletes a chore and removes it from the database', async () => {
    const { token, memberId } = await createTestFamily();
    const created = await createChore(token, memberId);
    const choreId = created.body.id;

    const res = await request(app)
      .delete(`/api/chores/${choreId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify the row is gone
    const dbRow = await pool.query('SELECT COUNT(*) FROM chores WHERE id = $1', [choreId]);
    expect(Number(dbRow.rows[0].count)).toBe(0);
  });

});

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('Auth', () => {

  it('returns 401 on POST /api/chores without a token', async () => {
    const res = await request(app)
      .post('/api/chores')
      .send({ memberId: 1, name: 'Clean room' });

    expect(res.status).toBe(401);
  });

});
