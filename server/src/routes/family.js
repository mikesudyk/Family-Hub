const express  = require('express');
const { pool } = require('../db');

const router = express.Router();

// ── GET /api/family ───────────────────────────────────────────────────────────
// Returns the complete family state — used to hydrate the frontend on load
router.get('/', async (req, res) => {
  const { familyId } = req;
  try {
    // Reset repeating chores that were completed on a previous day
    await pool.query(
      `UPDATE chores SET done = false, done_at = NULL
       WHERE family_id = $1 AND repeat IS NOT NULL AND done = true
       AND done_at IS NOT NULL AND done_at::date < CURRENT_DATE`,
      [familyId]
    );

    const [
      familyRes, settingsRes, membersRes,
      choresRes, choreListsRes, choreItemsRes,
      goalsRes, familyGoalsRes,
      todosRes, prioritiesRes,
      mealLibRes, mealsOnDeckRes, mealSlotsRes,
      shoppingListsRes, shoppingItemsRes, storesRes,
      calendarRes,
    ] = await Promise.all([
      pool.query('SELECT hub_name FROM families WHERE id = $1', [familyId]),
      pool.query('SELECT * FROM family_settings WHERE family_id = $1', [familyId]),
      pool.query('SELECT * FROM family_members WHERE family_id = $1 ORDER BY sort_order, id', [familyId]),
      pool.query('SELECT * FROM chores WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query('SELECT * FROM chore_lists WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query('SELECT cli.* FROM chore_list_items cli JOIN chore_lists cl ON cl.id = cli.chore_list_id WHERE cl.family_id = $1 ORDER BY cli.id', [familyId]),
      pool.query('SELECT * FROM goals WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query("SELECT * FROM family_goals WHERE family_id = $1 ORDER BY date DESC", [familyId]),
      pool.query('SELECT * FROM personal_todos WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query("SELECT * FROM parent_priorities WHERE family_id = $1 ORDER BY date DESC, id", [familyId]),
      pool.query('SELECT * FROM meal_library WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query(
        `SELECT * FROM meals_on_deck WHERE family_id = $1
         AND (archived = false OR archived_at > NOW() - INTERVAL '21 days')
         ORDER BY archived, id DESC`,
        [familyId]
      ),
      pool.query("SELECT * FROM meal_slots WHERE family_id = $1", [familyId]),
      pool.query('SELECT * FROM shopping_lists WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query('SELECT * FROM shopping_items WHERE family_id = $1 ORDER BY id', [familyId]),
      pool.query('SELECT name FROM stores WHERE family_id = $1 ORDER BY sort_order', [familyId]),
      pool.query("SELECT * FROM calendar_events WHERE family_id = $1 ORDER BY date", [familyId]),
    ]);

    const settings = settingsRes.rows[0] || {};

    // Build chores map: { memberId: [...] }
    const chores = {};
    for (const c of choresRes.rows) {
      const mid = c.member_id;
      if (!chores[mid]) chores[mid] = [];
      const repeat = (() => {
        if (!c.repeat) return null;
        try { const a = JSON.parse(c.repeat); return a; } catch {}
        // PostgreSQL array formats: {"Mon","Wed"} or {Mon,Wed}
        const s = c.repeat.trim();
        const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s;
        return inner.split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
      })();
      chores[mid].push({
        id: c.id, name: c.name, icon: c.icon, time: c.time,
        done: c.done, doneAt: c.done_at, fixed: c.fixed,
        repeat, listEventId: c.list_event_id,
      });
    }

    // Build chore lists with nested items
    const choreListItemsMap = {};
    for (const item of choreItemsRes.rows) {
      if (!choreListItemsMap[item.chore_list_id]) choreListItemsMap[item.chore_list_id] = [];
      choreListItemsMap[item.chore_list_id].push({ id: item.id, name: item.name, icon: item.icon });
    }
    const choreLists = choreListsRes.rows.map(l => ({
      id: l.id, name: l.name,
      chores: choreListItemsMap[l.id] || [],
    }));

    // Goals map: { memberId: [...] }
    const goals = {};
    for (const g of goalsRes.rows) {
      const mid = g.member_id;
      if (!goals[mid]) goals[mid] = [];
      goals[mid].push({ id: g.id, text: g.text, dueDate: g.due_date, done: g.done });
    }

    // Family goals map: { 'YYYY-MM-DD': [...] }
    const familyGoals = {};
    for (const g of familyGoalsRes.rows) {
      const d = g.date.toISOString().split('T')[0];
      if (!familyGoals[d]) familyGoals[d] = [];
      familyGoals[d].push({ id: g.id, text: g.text, done: g.done });
    }

    // Personal todos map: { memberId: [...] }
    const personalTodos = {};
    for (const t of todosRes.rows) {
      const mid = t.member_id;
      if (!personalTodos[mid]) personalTodos[mid] = [];
      personalTodos[mid].push({ id: t.id, text: t.text, done: t.done });
    }

    // Parent priorities map: { memberId: { 'YYYY-MM-DD': [...] } }
    const parentPriorities = {};
    for (const p of prioritiesRes.rows) {
      const mid = p.member_id;
      const d = p.date.toISOString().split('T')[0];
      if (!parentPriorities[mid]) parentPriorities[mid] = {};
      if (!parentPriorities[mid][d]) parentPriorities[mid][d] = [];
      parentPriorities[mid][d].push({ id: p.id, text: p.text, done: p.done });
    }

    // Meals on deck — flat array (active first, then archived within 3 weeks)
    const mealsOnDeck = mealsOnDeckRes.rows.map(m => ({
      id: m.id, title: m.title, fromLibrary: m.from_library,
      mealId: m.meal_id, ingredients: m.ingredients || [],
      archived: m.archived || false,
      archivedAt: m.archived_at || null,
    }));

    // Meal slots map: { 'YYYY-MM-DD': { Breakfast: '...', ... } }
    const meals = {};
    for (const s of mealSlotsRes.rows) {
      const d = s.date.toISOString().split('T')[0];
      if (!meals[d]) meals[d] = {};
      meals[d][s.slot] = s.value;
    }

    // Shopping lists with items nested
    const itemsByList = {};
    for (const item of shoppingItemsRes.rows) {
      if (!itemsByList[item.list_id]) itemsByList[item.list_id] = [];
      itemsByList[item.list_id].push({
        id: item.id, name: item.name, store: item.store,
        url: item.url, checked: item.checked,
      });
    }
    const shoppingLists = shoppingListsRes.rows.map(l => ({
      id: l.id, name: l.name, items: itemsByList[l.id] || [],
    }));

    res.json({
      hubName: familyRes.rows[0]?.hub_name || 'My Hub',
      countdown: settings.countdown_name
        ? { name: settings.countdown_name, date: settings.countdown_date?.toISOString().split('T')[0] }
        : { name: 'Summer Vacation', date: '2026-06-15' },
      countdownMode: settings.countdown_mode || 'birthday',
      bgImage: settings.bg_image || null,
      printMode: settings.print_mode || 'day',
      clock24h: settings.clock_24h || false,
      activeListEvent: settings.active_list_event || null,
      members: membersRes.rows.map(m => ({
        id: m.id, name: m.name, avatar: m.avatar,
        role: m.role, tier: m.tier,
        birthday: m.birthday ? m.birthday.toISOString().split('T')[0] : null,
        userId: m.user_id,
      })),
      chores,
      choreLists,
      goals,
      familyGoals,
      personalTodos,
      parentPriorities,
      mealLibrary: mealLibRes.rows.map(m => ({
        id: m.id, title: m.title, photoUrl: m.photo_url, ingredients: m.ingredients || [],
      })),
      mealsOnDeck,
      meals,
      shoppingLists,
      stores: storesRes.rows.map(s => s.name),
      userCalendarEvents: calendarRes.rows.map(e => ({
        id: e.id, date: e.date.toISOString().split('T')[0],
        title: e.title, time: e.time, endTime: e.end_time || null,
        color: e.color, icon: e.icon,
        notes: e.notes || null, url: e.url || null,
        location: e.location || null,
        provider: e.provider || null,
      })),
    });
  } catch (err) {
    console.error('[GET /family]', err);
    res.status(500).json({ error: 'Failed to load family data' });
  }
});

module.exports = router;
