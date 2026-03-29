# Aeramea Family Hub — Chore System Test Plan

## Overview

This document is a complete test plan for the chore system in the Aeramea Family Hub app. It is designed to be handed to Claude Code as a prompt to scaffold and implement the full test suite.

**Stack:** React 19 + Vite + TypeScript frontend on Cloudflare Pages, Express + PostgreSQL backend on Railway.

**Testing tools:** Vitest + Supertest for backend API tests, Vitest + React Testing Library for frontend unit tests.

---

## Phase 1: Backend Setup

### 1.1 Install Dependencies

In the `server/` directory, install:

```bash
npm install --save-dev vitest supertest
```

### 1.2 Create Vitest Config

Create `server/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.js'],
    testTimeout: 10000,
  },
});
```

### 1.3 Export the Express App

In `server/src/index.js`, the Express `app` object must be exported so Supertest can use it without starting the server on a port. Add at the bottom:

```js
module.exports = { app };
```

Make sure the `app.listen()` call is guarded so it doesn't run during tests:

```js
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
```

### 1.4 Test Database Strategy

Use a separate PostgreSQL test database. Tests should:

1. Connect to a test database using `TEST_DATABASE_URL` env var
2. Run migrations before the test suite
3. Clean all chore-related tables before each test
4. Close the pool after all tests

Create `server/src/__tests__/setup.js`:

```js
import { pool } from '../db';
import fs from 'fs';
import path from 'path';

// Run migrations
beforeAll(async () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../migrations/001_initial.sql'), 'utf8'
  );
  await pool.query(migration);

  const normalizeMigration = fs.readFileSync(
    path.join(__dirname, '../../migrations/006_normalize_chore_repeat.sql'), 'utf8'
  );
  // This migration is safe to run on empty tables
  await pool.query(normalizeMigration).catch(() => {});
});

// Clean tables before each test
beforeEach(async () => {
  await pool.query('DELETE FROM chore_list_items');
  await pool.query('DELETE FROM chore_lists');
  await pool.query('DELETE FROM chores');
  await pool.query('DELETE FROM family_settings');
  await pool.query('DELETE FROM family_members');
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM families');
});

afterAll(async () => {
  await pool.end();
});
```

**Important:** The `db.js` module needs to respect `TEST_DATABASE_URL` when present. Check how `pool` is created in `server/src/db.js` and ensure it uses `process.env.TEST_DATABASE_URL || process.env.DATABASE_URL`.

### 1.5 Test Helper — Create a Test Family

Many tests need a family, a user, and a family member to exist first. Create a helper:

```js
// server/src/__tests__/helpers.js

import { pool } from '../db';

export async function createTestFamily() {
  const familyRes = await pool.query(
    "INSERT INTO families (hub_name) VALUES ('Test Family') RETURNING id"
  );
  const familyId = familyRes.rows[0].id;

  const userRes = await pool.query(
    `INSERT INTO users (family_id, email, password_hash, name)
     VALUES ($1, 'test@test.com', 'hashedpassword', 'Test Parent') RETURNING id`,
    [familyId]
  );

  const memberRes = await pool.query(
    `INSERT INTO family_members (family_id, name, role, tier)
     VALUES ($1, 'Test Kid', 'child', 'child') RETURNING id`,
    [familyId]
  );

  const member2Res = await pool.query(
    `INSERT INTO family_members (family_id, name, role, tier)
     VALUES ($1, 'Test Kid 2', 'child', 'child') RETURNING id`,
    [familyId]
  );

  // Create family_settings row (needed for list assignment)
  await pool.query(
    'INSERT INTO family_settings (family_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [familyId]
  );

  return {
    familyId,
    userId: userRes.rows[0].id,
    memberId: memberRes.rows[0].id,
    member2Id: member2Res.rows[0].id,
  };
}
```

### 1.6 Auth Bypass for Tests

The chore routes use `req.familyId` which is set by auth middleware. For testing, you need to either:

- Create a middleware bypass that sets `req.familyId` for test requests
- Or create an authenticated session in the test setup

The simplest approach: create a test helper that wraps Supertest and injects the familyId. Check how auth middleware works in `server/src/index.js` — it likely reads from a JWT cookie or session. The test helper should either mock the auth middleware or create a real session.

**If auth is cookie-based**, the helper should sign in first and carry the cookie:

```js
export async function authenticatedAgent(app, familyId) {
  // Option A: Mock auth middleware for tests
  // Option B: Actually sign in and use the cookie
  // Implement based on how server/src/index.js handles auth
}
```

---

## Phase 2: Backend API Tests — Chore CRUD

### File: `server/src/__tests__/chores.test.js`

### Test 2.1: Create a one-time chore

```
POST /api/chores
Body: { memberId: <kidId>, name: "Clean room", icon: "🧹" }
Expect:
  - Status 201
  - Response has { id, memberId, name, icon, time, done, repeat }
  - done === false
  - repeat === null
  - Verify row exists in database: SELECT * FROM chores WHERE id = <returned id>
```

### Test 2.2: Create a daily repeating chore

```
POST /api/chores
Body: { memberId: <kidId>, name: "Make bed", icon: "🛏️", repeat: "daily" }
Expect:
  - Status 201
  - repeat === "daily"
  - Database row has repeat = 'daily'
```

### Test 2.3: Create a chore repeating on specific days

```
POST /api/chores
Body: { memberId: <kidId>, name: "Take out trash", icon: "🗑️", repeat: ["Mon", "Wed", "Fri"] }
Expect:
  - Status 201
  - repeat is array ["Mon", "Wed", "Fri"]
  - Database row has repeat = '["Mon","Wed","Fri"]' (JSON string)
```

### Test 2.4: Create a biweekly chore

```
POST /api/chores
Body: { memberId: <kidId>, name: "Mow lawn", icon: "🌿", repeat: "biweekly" }
Expect:
  - Status 201
  - repeat === "biweekly"
```

### Test 2.5: Reject chore without name

```
POST /api/chores
Body: { memberId: <kidId> }
Expect:
  - Status 400
  - Error message about name being required
```

### Test 2.6: Reject chore without memberId

```
POST /api/chores
Body: { name: "Clean room" }
Expect:
  - Status 400
  - Error message about memberId being required
```

### Test 2.7: Toggle a chore done

```
Setup: Create a chore (done = false)
PUT /api/chores/<id>/toggle
Expect:
  - Status 200
  - done === true
  - Database: done = true AND done_at IS NOT NULL
```

### Test 2.8: Toggle a chore back to not done

```
Setup: Create a chore, toggle it done, then toggle again
PUT /api/chores/<id>/toggle
Expect:
  - done === false
  - Database: done = false AND done_at IS NULL
```

### Test 2.9: Update a chore

```
Setup: Create a chore named "Clean room"
PUT /api/chores/<id>
Body: { name: "Deep clean room", icon: "✨", repeat: "daily" }
Expect:
  - Status 200
  - name === "Deep clean room"
  - icon === "✨"
  - repeat === "daily"
```

### Test 2.10: Delete a chore

```
Setup: Create a chore
DELETE /api/chores/<id>
Expect:
  - Status 200
  - Database: SELECT COUNT(*) FROM chores WHERE id = <id> returns 0
```

### Test 2.11: Toggle nonexistent chore returns 404

```
PUT /api/chores/99999/toggle
Expect:
  - Status 404
```

---

## Phase 3: Backend API Tests — List Assignment

### File: `server/src/__tests__/chore-lists.test.js`

### Test 3.1: Create a chore list

```
POST /api/chores/lists
Body: { name: "Morning Routine" }
Expect:
  - Status 201
  - Response has { id, name, chores: [] }
```

### Test 3.2: Add items to a chore list

```
Setup: Create a chore list
POST /api/chores/lists/<listId>/items
Body: { name: "Brush teeth", icon: "🪥" }
Expect:
  - Status 201
  - Response has { id, listId, name, icon }
```

### Test 3.3: Assign a chore list to kids

```
Setup: Create a chore list with 2 items, have 2 kids
POST /api/chores/assign-list
Body: {
  listId: <listId>,
  listName: "Morning Routine",
  assignments: [
    { kidId: <kid1Id>, name: "Brush teeth", icon: "🪥" },
    { kidId: <kid1Id>, name: "Make bed", icon: "🛏️" },
    { kidId: <kid2Id>, name: "Brush teeth", icon: "🪥" },
    { kidId: <kid2Id>, name: "Make bed", icon: "🛏️" },
  ]
}
Expect:
  - Status 201
  - Response has eventId and chores array with 4 items
  - All chores in database with matching list_event_id
  - family_settings.active_list_event is set with correct eventId, name, listId
  - Chores for kid1 and kid2 both exist in database
```

### Test 3.4: Dismiss a list event

```
Setup: Assign a list (so active_list_event is set)
DELETE /api/chores/dismiss-list
Expect:
  - Status 200
  - family_settings.active_list_event IS NULL
  - Chores created by assignment still exist (dismiss doesn't delete them)
```

### Test 3.5: Reject list assignment without required fields

```
POST /api/chores/assign-list
Body: { listId: 1 }  (missing listName and assignments)
Expect:
  - Status 400
```

### Test 3.6: Delete a chore list

```
Setup: Create a chore list with items
DELETE /api/chores/lists/<listId>
Expect:
  - Status 200
  - Chore list deleted
  - Chore list items cascade deleted
```

---

## Phase 4: Backend API Tests — Hydration & Reset Logic

### File: `server/src/__tests__/family-hydration.test.js`

These tests hit GET /api/family and verify the chore data comes back in the right shape.

### Test 4.1: Chores returned grouped by member_id

```
Setup: Create 2 chores for kid1, 1 chore for kid2
GET /api/family
Expect:
  - Response body has chores object
  - chores[kid1Id] is array of length 2
  - chores[kid2Id] is array of length 1
  - Each chore has: id, name, icon, time, done, doneAt, fixed, repeat, listEventId
```

### Test 4.2: Repeating chore done yesterday gets reset

```
Setup: Create a daily chore, then manually update it in the database:
  UPDATE chores SET done = true, done_at = (CURRENT_DATE - 1)::text WHERE id = <id>
GET /api/family
Expect:
  - The chore comes back with done === false
  - Database: done = false, done_at IS NULL
```

### Test 4.3: Repeating chore done today stays done

```
Setup: Create a daily chore, toggle it done (done_at will be NOW())
GET /api/family
Expect:
  - The chore comes back with done === true
```

### Test 4.4: One-time chore stays done regardless of when

```
Setup: Create a chore with repeat = null, toggle it done
  UPDATE chores SET done_at = (CURRENT_DATE - 5)::text WHERE id = <id>
GET /api/family
Expect:
  - The chore comes back with done === true (reset only affects chores where repeat IS NOT NULL)
```

### Test 4.5: Repeat field parsed correctly from database

```
Setup: Insert chores directly with various repeat formats:
  - repeat = 'daily'
  - repeat = '["Mon","Wed"]'
  - repeat = 'biweekly'
  - repeat = NULL
  - repeat = 'once'
GET /api/family
Expect:
  - daily → "daily"
  - '["Mon","Wed"]' → ["Mon", "Wed"] (parsed array)
  - biweekly → "biweekly"
  - NULL → null
  - once → "once"
```

### Test 4.6: Chore lists returned with nested items

```
Setup: Create a chore list with 3 items
GET /api/family
Expect:
  - choreLists is array with 1 list
  - That list has { id, name, chores: [...] }
  - chores array has 3 items, each with { id, name, icon }
```

### Test 4.7: active_list_event returned from settings

```
Setup: Assign a chore list (which sets active_list_event in family_settings)
GET /api/family
Expect:
  - activeListEvent is not null
  - Has { id, name, listId }
```

---

## Phase 5: Frontend Unit Tests

### File: `src/__tests__/chore-utils.test.js`

Note: There's already a test file at `src/utils/chores.test.js`. Review what's covered there and add any missing cases.

### Test 5.1: choreAppliesToday — no repeat (one-time)

```
Input: chore with repeat = null
Expect: returns true (one-time chores always show)
```

### Test 5.2: choreAppliesToday — repeat = "once"

```
Input: chore with repeat = "once"
Expect: returns true
```

### Test 5.3: choreAppliesToday — repeat = "daily"

```
Input: chore with repeat = "daily"
Expect: returns true (daily always applies)
```

### Test 5.4: choreAppliesToday — repeat = ["Mon", "Wed", "Fri"]

```
Mock the date to a Monday
Input: chore with repeat = ["Mon", "Wed", "Fri"]
Expect: returns true

Mock the date to a Tuesday
Expect: returns false
```

### Test 5.5: choreAppliesToday — repeat = "biweekly"

```
Test with dates in active and inactive weeks
Based on EPOCH = 2025-01-06
Verify alternating week behavior
```

---

## Phase 6: Frontend API URL Tests

### File: `src/__tests__/api-urls.test.js`

These tests verify the frontend calls the correct backend endpoints. Mock `apiFetch` and verify the URLs.

### Test 6.1: addChore calls POST /api/chores

```
Mock apiFetch
Call addChore(kidId, "Clean room", "🧹", null)
Expect: apiFetch called with '/api/chores', method POST, body includes memberId, name, icon
```

### Test 6.2: assignListEvent calls POST /api/chores/assign-list

```
Mock apiFetch
Call assignListEvent(listId, "Morning Routine", assignments)
Expect: apiFetch called with '/api/chores/assign-list' (NOT /api/chores/lists/<id>/assign)
Body includes { listId, listName, assignments }
```

### Test 6.3: dismissListEvent calls DELETE /api/chores/dismiss-list

```
Mock apiFetch
Call dismissListEvent()
Expect: apiFetch called with '/api/chores/dismiss-list', method DELETE
```

### Test 6.4: toggleChore calls PUT /api/chores/<id>/toggle

```
Mock apiFetch
Call toggleChore(kidId, choreId)
Expect: apiFetch called with '/api/chores/<choreId>/toggle', method PUT
```

### Test 6.5: removeChore calls DELETE /api/chores/<id>

```
Mock apiFetch
Call removeChore(kidId, choreId)
Expect: apiFetch called with '/api/chores/<choreId>', method DELETE
```

---

## Phase 7: Add npm Scripts

Add to `server/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Add to root `package.json` (frontend):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Phase 8: Known Issues to Fix

### 8.1: done_at should be TIMESTAMPTZ, not VARCHAR

Create a new migration `server/migrations/XXX_fix_done_at_type.sql`:

```sql
-- Convert done_at from VARCHAR to TIMESTAMPTZ
ALTER TABLE chores
  ALTER COLUMN done_at TYPE TIMESTAMPTZ
  USING CASE
    WHEN done_at IS NOT NULL AND done_at != '' THEN done_at::timestamptz
    ELSE NULL
  END;
```

This makes the `done_at::date < CURRENT_DATE` cast in the hydration query safe and correct.

### 8.2: Optimistic UI should handle API failures

Currently all chore functions use `.catch(console.error)` which silently swallows errors. At minimum, add a toast/notification system so users know when a save fails. The pattern:

```js
apiFetch('/api/chores', { ... })
  .then(c => { /* update with real ID */ })
  .catch(err => {
    console.error(err);
    // Revert the optimistic update
    setChores(prev => { /* remove the temp chore */ });
    // Show error to user
    showToast('Failed to save chore. Please try again.');
  });
```

This is a larger change — flag it for a future pass after the test suite is in place.

---

## Execution Order

When handing this to Claude Code, implement in this order:

1. **Setup** (1.1–1.6): Install deps, create config, export app, create helpers
2. **Chore CRUD tests** (Phase 2): The most critical — validates saves work
3. **List assignment tests** (Phase 3): Validates the bug we just fixed
4. **Hydration tests** (Phase 4): Validates the read/display path
5. **Frontend tests** (Phases 5–6): Validates UI logic and API URLs
6. **npm scripts** (Phase 7): Wire it up
7. **Fix done_at type** (Phase 8.1): Database fix
8. **Run all tests** and fix any failures
