import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { FAMILY } from '../data/family';
import { INITIAL_CHORES } from '../data/chores';
import { apiFetch, setToken, clearToken } from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authStatus, setAuthStatus]       = useState('loading'); // 'loading' | 'guest' | 'authenticated'
  const [isOnboarding, setIsOnboarding]   = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [justSignedUp, setJustSignedUp]   = useState(false);
  const [pendingInviteUrl, setPendingInviteUrl] = useState(null);
  const [calendarConnections, setCalendarConnections] = useState([]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [screen, setScreen]       = useState('hub');
  const [screenData, setScreenData] = useState(null);

  // ── Family data ─────────────────────────────────────────────────────────────
  const [dynamicMembers, setDynamicMembers] = useState(null);
  const [hubName, setHubName]         = useState('Sudyk Hub');
  const [countdown, setCountdown]     = useState({ name: 'Summer Vacation', date: '2026-06-15' });
  const [countdownMode, setCountdownMode] = useState('birthday');
  const [printMode, setPrintMode]     = useState('day');
  const [bgImage, setBgImage]         = useState('/default-bg.jpeg');
  const [activeListEvent, setActiveListEvent] = useState(null);

  const [chores, setChores]           = useState(JSON.parse(JSON.stringify(INITIAL_CHORES)));
  const [choreLists, setChoreLists]   = useState([]);
  const [tierOverrides, setTierOverrides]   = useState({});
  const [memberOverrides, setMemberOverrides] = useState({});
  const [goals, setGoals]             = useState({});
  const [familyGoals, setFamilyGoals] = useState({});
  const [personalTodos, setPersonalTodos] = useState({});
  const [parentPriorities, setParentPriorities] = useState({});
  const [mealsOnDeck, setMealsOnDeck] = useState({});
  const [meals, setMeals]             = useState({});
  const [mealLibrary, setMealLibrary] = useState([]);
  const [stores, setStores]           = useState(["Sam's", 'Costco', 'Meijer', 'Aldi', "Trader Joe's", 'Wal-Mart']);
  const [shoppingLists, setShoppingLists] = useState([{ id: 1, name: 'Grocery', items: [] }]);
  const [userCalendarEvents, setUserCalendarEvents] = useState([]);
  const [showDailyOverview, setShowDailyOverview] = useState(false);

  const socketRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isAuthenticated = authStatus === 'authenticated';

  function applyFamilyData(data) {
    setDynamicMembers(data.members || []);
    setHubName(data.hubName || 'My Hub');
    if (data.countdown) setCountdown(data.countdown);
    if (data.countdownMode) setCountdownMode(data.countdownMode);
    if (data.bgImage) setBgImage(data.bgImage);
    if (data.printMode) setPrintMode(data.printMode);
    if (data.activeListEvent) setActiveListEvent(data.activeListEvent);
    setChores(data.chores || {});
    setChoreLists(data.choreLists || []);
    setGoals(data.goals || {});
    setFamilyGoals(data.familyGoals || {});
    setPersonalTodos(data.personalTodos || {});
    setParentPriorities(data.parentPriorities || {});
    setMealsOnDeck(data.mealsOnDeck || {});
    setMeals(data.meals || {});
    setMealLibrary(data.mealLibrary || []);
    if (data.stores?.length) setStores(data.stores);
    setShoppingLists(data.shoppingLists || []);
    setUserCalendarEvents(data.userCalendarEvents || []);
  }

  function setupSocketListeners(socket) {
    socketRef.current = socket;

    // Settings
    socket.on('settings:updated', u => {
      if (u.hubName !== undefined) setHubName(u.hubName);
      if (u.countdownName !== undefined) setCountdown(c => ({ ...c, name: u.countdownName }));
      if (u.countdownDate !== undefined) setCountdown(c => ({ ...c, date: u.countdownDate }));
      if (u.countdownMode !== undefined) setCountdownMode(u.countdownMode);
      if (u.bgImage !== undefined) setBgImage(u.bgImage);
      if (u.printMode !== undefined) setPrintMode(u.printMode);
    });

    // Members
    socket.on('member:added', m => setDynamicMembers(prev => [...(prev || []), m]));
    socket.on('member:updated', m => setDynamicMembers(prev =>
      (prev || []).map(x => x.id === m.id ? { ...x, ...m } : x)
    ));
    socket.on('member:deleted', ({ id }) => setDynamicMembers(prev =>
      (prev || []).filter(x => x.id !== id)
    ));

    // Chores
    socket.on('chore:added', ({ memberId, chore }) => setChores(prev => ({
      ...prev, [memberId]: [...(prev[memberId] || []), chore],
    })));
    socket.on('chore:updated', ({ memberId, chore }) => setChores(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).map(c => c.id === chore.id ? { ...c, ...chore } : c),
    })));
    socket.on('chore:toggled', ({ memberId, id, done, doneAt }) => setChores(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).map(c => c.id === id ? { ...c, done, doneAt } : c),
    })));
    socket.on('chore:deleted', ({ memberId, id }) => setChores(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).filter(c => c.id !== id),
    })));
    socket.on('choreList:added', list => setChoreLists(prev => [...prev, list]));
    socket.on('choreList:updated', list => setChoreLists(prev =>
      prev.map(l => l.id === list.id ? { ...l, ...list } : l)
    ));
    socket.on('choreList:deleted', ({ id }) => setChoreLists(prev => prev.filter(l => l.id !== id)));
    socket.on('listEvent:assigned', ({ activeListEvent: ale, chores: newChores }) => {
      setActiveListEvent(ale);
      setChores(prev => {
        const updated = { ...prev };
        for (const [mid, items] of Object.entries(newChores)) {
          updated[mid] = [...(updated[mid] || []), ...items];
        }
        return updated;
      });
    });
    socket.on('listEvent:dismissed', () => setActiveListEvent(null));

    // Goals
    socket.on('goal:added', ({ memberId, goal }) => setGoals(prev => ({
      ...prev, [memberId]: [...(prev[memberId] || []), goal],
    })));
    socket.on('goal:updated', ({ memberId, goal }) => setGoals(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).map(g => g.id === goal.id ? { ...g, ...goal } : g),
    })));
    socket.on('goal:deleted', ({ memberId, id }) => setGoals(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).filter(g => g.id !== id),
    })));

    // Family goals
    socket.on('familyGoal:added', ({ date, goal }) => setFamilyGoals(prev => ({
      ...prev, [date]: [...(prev[date] || []), goal],
    })));
    socket.on('familyGoal:updated', ({ date, goal }) => setFamilyGoals(prev => ({
      ...prev, [date]: (prev[date] || []).map(g => g.id === goal.id ? { ...g, ...goal } : g),
    })));
    socket.on('familyGoal:deleted', ({ date, id }) => setFamilyGoals(prev => ({
      ...prev, [date]: (prev[date] || []).filter(g => g.id !== id),
    })));

    // Personal todos
    socket.on('todo:added', ({ memberId, todo }) => setPersonalTodos(prev => ({
      ...prev, [memberId]: [...(prev[memberId] || []), todo],
    })));
    socket.on('todo:updated', ({ memberId, todo }) => setPersonalTodos(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).map(t => t.id === todo.id ? { ...t, ...todo } : t),
    })));
    socket.on('todo:deleted', ({ memberId, id }) => setPersonalTodos(prev => ({
      ...prev, [memberId]: (prev[memberId] || []).filter(t => t.id !== id),
    })));

    // Parent priorities
    socket.on('priority:added', ({ memberId, date, priority }) => setParentPriorities(prev => ({
      ...prev, [memberId]: { ...(prev[memberId] || {}), [date]: [...((prev[memberId] || {})[date] || []), priority] },
    })));
    socket.on('priority:updated', ({ memberId, date, priority }) => setParentPriorities(prev => ({
      ...prev, [memberId]: {
        ...(prev[memberId] || {}),
        [date]: ((prev[memberId] || {})[date] || []).map(p => p.id === priority.id ? { ...p, ...priority } : p),
      },
    })));
    socket.on('priority:deleted', ({ memberId, date, id }) => setParentPriorities(prev => ({
      ...prev, [memberId]: {
        ...(prev[memberId] || {}),
        [date]: ((prev[memberId] || {})[date] || []).filter(p => p.id !== id),
      },
    })));

    // Meals
    socket.on('meal:added', m => setMealLibrary(prev => [...prev, m]));
    socket.on('meal:updated', m => setMealLibrary(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x)));
    socket.on('meal:deleted', ({ id }) => setMealLibrary(prev => prev.filter(x => x.id !== id)));
    socket.on('mealOnDeck:added', m => setMealsOnDeck(prev => ({
      ...prev, [m.date]: [...(prev[m.date] || []), m],
    })));
    socket.on('mealOnDeck:deleted', ({ id, date }) => setMealsOnDeck(prev => ({
      ...prev, [date]: (prev[date] || []).filter(m => m.id !== id),
    })));
    socket.on('mealSlot:updated', ({ date, slot, value }) => setMeals(prev => ({
      ...prev, [date]: { ...(prev[date] || {}), [slot]: value },
    })));

    // Shopping
    socket.on('shoppingList:added', list => setShoppingLists(prev => [...prev, list]));
    socket.on('shoppingList:renamed', ({ id, name }) => setShoppingLists(prev =>
      prev.map(l => l.id === id ? { ...l, name } : l)
    ));
    socket.on('shoppingList:deleted', ({ id }) => setShoppingLists(prev => prev.filter(l => l.id !== id)));
    socket.on('shoppingItem:added', item => setShoppingLists(prev =>
      prev.map(l => l.id === item.listId ? { ...l, items: [...l.items, item] } : l)
    ));
    socket.on('shoppingItem:toggled', ({ id, listId, checked }) => setShoppingLists(prev =>
      prev.map(l => l.id === listId
        ? { ...l, items: l.items.map(i => i.id === id ? { ...i, checked } : i) }
        : l
      )
    ));
    socket.on('shoppingItem:deleted', ({ id, listId }) => setShoppingLists(prev =>
      prev.map(l => l.id === listId ? { ...l, items: l.items.filter(i => i.id !== id) } : l)
    ));
    socket.on('stores:updated', ({ stores: s }) => setStores(s));

    // Calendar
    socket.on('calendarEvent:added', e => setUserCalendarEvents(prev => [...prev, e]));
    socket.on('calendarEvent:updated', e => setUserCalendarEvents(prev =>
      prev.map(x => x.id === e.id ? { ...x, ...e } : x)
    ));
    socket.on('calendarEvent:deleted', ({ id }) => setUserCalendarEvents(prev =>
      prev.filter(x => x.id !== id)
    ));
  }

  async function loadFamilyData(overrideToken) {
    try {
      const [data, connections] = await Promise.all([
        apiFetch('/api/family', {}, overrideToken),
        apiFetch('/api/calendar/connections', {}, overrideToken).catch(() => []),
      ]);
      applyFamilyData(data);
      setCalendarConnections(connections);
      setAuthStatus('authenticated');
      const token = overrideToken || localStorage.getItem('aeramea_token');
      const socket = connectSocket(token);
      setupSocketListeners(socket);
    } catch (err) {
      clearToken();
      setAuthStatus('guest');
    }
  }

  // On mount: check for existing token
  useEffect(() => {
    const token = localStorage.getItem('aeramea_token');
    if (!token) {
      setAuthStatus('guest');
      return;
    }
    loadFamilyData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth functions ───────────────────────────────────────────────────────────

  async function signIn(email, password) {
    const data = await apiFetch('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setCurrentMemberId(data.memberId);
    await loadFamilyData(data.token);
  }

  function startOnboarding(data) {
    setOnboardingData(data);
    setIsOnboarding(true);
  }

  async function completeOnboarding(data) {
    const result = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: onboardingData.name,
        email: onboardingData.email,
        password: onboardingData.password,
        familyName: data.familyName,
        parentAvatar: data.parentAvatar || '👨',
        kids: data.kids || [],
        partnerEmail: data.partnerEmail || null,
      }),
    });
    setToken(result.token);
    setCurrentMemberId(result.memberId);
    setIsOnboarding(false);
    if (result.inviteUrl) setPendingInviteUrl(result.inviteUrl);
    setJustSignedUp(true);
    await loadFamilyData(result.token);
  }

  function signOut() {
    clearToken();
    disconnectSocket();
    socketRef.current = null;
    setAuthStatus('guest');
    setIsOnboarding(false);
    setOnboardingData(null);
    setCurrentMemberId(null);
    setDynamicMembers(null);
    setChores(JSON.parse(JSON.stringify(INITIAL_CHORES)));
    setChoreLists([]);
    setGoals({});
    setFamilyGoals({});
    setPersonalTodos({});
    setParentPriorities({});
    setMealsOnDeck({});
    setMeals({});
    setMealLibrary([]);
    setShoppingLists([{ id: 1, name: 'Grocery', items: [] }]);
    setUserCalendarEvents([]);
    setScreen('hub');
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  function navigate(to, data = null) {
    setScreen(to);
    setScreenData(data);
    window.scrollTo(0, 0);
  }

  // ── Members ──────────────────────────────────────────────────────────────────

  function getAllMembers() {
    const source = dynamicMembers !== null ? dynamicMembers : FAMILY;
    return source.map(m => ({ ...m, ...(memberOverrides[m.id] || {}) }));
  }

  function getMember(id) {
    const source = dynamicMembers !== null ? dynamicMembers : FAMILY;
    const base = source.find(m => m.id === Number(id));
    if (!base) return null;
    return { ...base, ...(memberOverrides[base.id] || {}) };
  }

  function updateMember(id, changes) {
    setMemberOverrides(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...changes } }));
    apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(changes) }).catch(console.error);
  }

  async function addMember(data) {
    const m = await apiFetch('/api/members', { method: 'POST', body: JSON.stringify(data) });
    setDynamicMembers(prev => [...(prev || []), m]);
    return m;
  }

  // ── Tiers ────────────────────────────────────────────────────────────────────

  function setTier(memberId, tier) {
    setTierOverrides(prev => ({ ...prev, [memberId]: tier }));
  }

  function getTier(member) {
    return tierOverrides[member.id] || member.tier;
  }

  // ── Chores ───────────────────────────────────────────────────────────────────

  function getChores(kidId) {
    return chores[kidId] || [];
  }

  function doneCount(kidId) {
    return getChores(kidId).filter(c => c.done).length;
  }

  function totalCount(kidId) {
    return getChores(kidId).length;
  }

  function toggleChore(kidId, choreId) {
    setChores(prev => {
      const updated = { ...prev };
      updated[kidId] = (updated[kidId] || []).map(c =>
        c.id === choreId
          ? { ...c, done: !c.done, doneAt: !c.done ? 'just now' : undefined }
          : c
      );
      return updated;
    });
    apiFetch(`/api/chores/${choreId}/toggle`, { method: 'PUT' }).catch(console.error);
  }

  function addChore(kidId, name, icon = '✅', repeat = null) {
    const tempId = Date.now();
    setChores(prev => ({
      ...prev,
      [kidId]: [...(prev[kidId] || []), { id: tempId, name, icon, time: 'Any', done: false, fixed: false, repeat }],
    }));
    apiFetch('/api/chores', {
      method: 'POST',
      body: JSON.stringify({ memberId: kidId, name, icon, repeat }),
    }).then(c => {
      setChores(prev => ({
        ...prev,
        [kidId]: (prev[kidId] || []).map(x => x.id === tempId ? { ...x, id: c.id } : x),
      }));
    }).catch(console.error);
  }

  function removeChore(kidId, choreId) {
    setChores(prev => ({
      ...prev,
      [kidId]: (prev[kidId] || []).filter(c => c.id !== choreId),
    }));
    apiFetch(`/api/chores/${choreId}`, { method: 'DELETE' }).catch(console.error);
  }

  function assignListEvent(listId, listName, assignments) {
    const eventId = Date.now();
    setActiveListEvent({ id: eventId, name: listName, listId });
    setChores(prev => {
      const updated = { ...prev };
      assignments.forEach(({ kidId, name, icon }, idx) => {
        updated[kidId] = [...(updated[kidId] || []), {
          id: eventId + idx + 1, name, icon, time: 'Any', done: false, fixed: false,
          listEventId: eventId,
        }];
      });
      return updated;
    });
    apiFetch(`/api/chores/lists/${listId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    }).catch(console.error);
  }

  function dismissListEvent() {
    setActiveListEvent(null);
    apiFetch('/api/chores/lists/dismiss', { method: 'POST' }).catch(console.error);
  }

  function getListEventProgress(eventId) {
    const all = Object.values(chores).flat().filter(c => c.listEventId === eventId);
    return { total: all.length, done: all.filter(c => c.done).length };
  }

  // ── Chore lists ──────────────────────────────────────────────────────────────

  function getChoreList(listId) {
    return choreLists.find(l => l.id === listId) || null;
  }

  function addChoreList(name) {
    const tempId = Date.now();
    setChoreLists(prev => [...prev, { id: tempId, name, chores: [] }]);
    apiFetch('/api/chores/lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }).then(l => {
      setChoreLists(prev => prev.map(x => x.id === tempId ? { ...x, id: l.id } : x));
    }).catch(console.error);
    return tempId;
  }

  function deleteChoreList(listId) {
    setChoreLists(prev => prev.filter(l => l.id !== listId));
    apiFetch(`/api/chores/lists/${listId}`, { method: 'DELETE' }).catch(console.error);
  }

  function updateChoreListName(listId, name) {
    setChoreLists(prev => prev.map(l => l.id === listId ? { ...l, name } : l));
    apiFetch(`/api/chores/lists/${listId}`, { method: 'PUT', body: JSON.stringify({ name }) }).catch(console.error);
  }

  function addChoreToList(listId, name, icon = '✅') {
    const tempId = Date.now();
    setChoreLists(prev => prev.map(l =>
      l.id === listId
        ? { ...l, chores: [...l.chores, { id: tempId, name, icon }] }
        : l
    ));
    apiFetch(`/api/chores/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ name, icon }),
    }).then(item => {
      setChoreLists(prev => prev.map(l =>
        l.id === listId
          ? { ...l, chores: l.chores.map(c => c.id === tempId ? { ...c, id: item.id } : c) }
          : l
      ));
    }).catch(console.error);
  }

  function removeChoreFromList(listId, choreId) {
    setChoreLists(prev => prev.map(l =>
      l.id === listId ? { ...l, chores: l.chores.filter(c => c.id !== choreId) } : l
    ));
    apiFetch(`/api/chores/lists/${listId}/items/${choreId}`, { method: 'DELETE' }).catch(console.error);
  }

  // ── Goals ────────────────────────────────────────────────────────────────────

  function getGoals(kidId) {
    return goals[kidId] || [];
  }

  function addGoal(kidId, text, _emoji = '🎯', dueDate = null) {
    const tempId = Date.now();
    setGoals(prev => ({
      ...prev,
      [kidId]: [...(prev[kidId] || []), { id: tempId, text, dueDate, done: false }],
    }));
    apiFetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ memberId: kidId, text, dueDate }),
    }).then(g => {
      setGoals(prev => ({
        ...prev,
        [kidId]: (prev[kidId] || []).map(x => x.id === tempId ? { ...x, id: g.id } : x),
      }));
    }).catch(console.error);
  }

  function removeGoal(kidId, goalId) {
    setGoals(prev => ({
      ...prev,
      [kidId]: (prev[kidId] || []).filter(g => g.id !== goalId),
    }));
    apiFetch(`/api/goals/${goalId}`, { method: 'DELETE' }).catch(console.error);
  }

  function toggleGoal(kidId, goalId) {
    setGoals(prev => ({
      ...prev,
      [kidId]: (prev[kidId] || []).map(g => g.id === goalId ? { ...g, done: !g.done } : g),
    }));
    apiFetch(`/api/goals/${goalId}/toggle`, { method: 'PUT' }).catch(console.error);
  }

  // ── Family goals ─────────────────────────────────────────────────────────────

  function toggleFamilyGoal(date, goalId) {
    setFamilyGoals(prev => ({
      ...prev,
      [date]: (prev[date] || []).map(g => g.id === goalId ? { ...g, done: !g.done } : g),
    }));
    apiFetch(`/api/goals/family/${goalId}/toggle`, { method: 'PUT' }).catch(console.error);
  }

  function addFamilyGoal(date, text) {
    const tempId = Date.now();
    setFamilyGoals(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), { id: tempId, text, done: false }],
    }));
    apiFetch('/api/goals/family', {
      method: 'POST',
      body: JSON.stringify({ date, text }),
    }).then(g => {
      setFamilyGoals(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(x => x.id === tempId ? { ...x, id: g.id } : x),
      }));
    }).catch(console.error);
  }

  function removeFamilyGoal(date, goalId) {
    setFamilyGoals(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(g => g.id !== goalId),
    }));
    apiFetch(`/api/goals/family/${goalId}`, { method: 'DELETE' }).catch(console.error);
  }

  function updateFamilyGoal(date, goalId, text) {
    setFamilyGoals(prev => ({
      ...prev,
      [date]: (prev[date] || []).map(g => g.id === goalId ? { ...g, text } : g),
    }));
    apiFetch(`/api/goals/family/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    }).catch(console.error);
  }

  // ── Personal todos ───────────────────────────────────────────────────────────

  function getPersonalTodos(kidId) {
    return personalTodos[kidId] || [];
  }

  function addPersonalTodo(kidId, text) {
    const tempId = Date.now();
    setPersonalTodos(prev => ({
      ...prev,
      [kidId]: [...(prev[kidId] || []), { id: tempId, text, done: false }],
    }));
    apiFetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ memberId: kidId, text }),
    }).then(t => {
      setPersonalTodos(prev => ({
        ...prev,
        [kidId]: (prev[kidId] || []).map(x => x.id === tempId ? { ...x, id: t.id } : x),
      }));
    }).catch(console.error);
  }

  function removePersonalTodo(kidId, todoId) {
    setPersonalTodos(prev => ({
      ...prev,
      [kidId]: (prev[kidId] || []).filter(t => t.id !== todoId),
    }));
    apiFetch(`/api/todos/${todoId}`, { method: 'DELETE' }).catch(console.error);
  }

  function togglePersonalTodo(kidId, todoId) {
    setPersonalTodos(prev => ({
      ...prev,
      [kidId]: (prev[kidId] || []).map(t => t.id === todoId ? { ...t, done: !t.done } : t),
    }));
    apiFetch(`/api/todos/${todoId}/toggle`, { method: 'PUT' }).catch(console.error);
  }

  // ── Parent priorities ────────────────────────────────────────────────────────

  function getParentPriorities(memberId, date) {
    return (parentPriorities[memberId] || {})[date] || [];
  }

  function addParentPriority(memberId, date, text) {
    const tempId = Date.now();
    setParentPriorities(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [date]: [...((prev[memberId] || {})[date] || []), { id: tempId, text, done: false }],
      },
    }));
    apiFetch('/api/todos/priorities', {
      method: 'POST',
      body: JSON.stringify({ memberId, date, text }),
    }).then(p => {
      setParentPriorities(prev => ({
        ...prev,
        [memberId]: {
          ...(prev[memberId] || {}),
          [date]: ((prev[memberId] || {})[date] || []).map(x => x.id === tempId ? { ...x, id: p.id } : x),
        },
      }));
    }).catch(console.error);
  }

  function removeParentPriority(memberId, date, itemId) {
    setParentPriorities(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [date]: ((prev[memberId] || {})[date] || []).filter(t => t.id !== itemId),
      },
    }));
    apiFetch(`/api/todos/priorities/${itemId}`, { method: 'DELETE' }).catch(console.error);
  }

  function toggleParentPriority(memberId, date, itemId) {
    setParentPriorities(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [date]: ((prev[memberId] || {})[date] || []).map(t =>
          t.id === itemId ? { ...t, done: !t.done } : t
        ),
      },
    }));
    apiFetch(`/api/todos/priorities/${itemId}/toggle`, { method: 'PUT' }).catch(console.error);
  }

  // ── Meals on deck ────────────────────────────────────────────────────────────

  function getMealsOnDeck(date) {
    return mealsOnDeck[date] || [];
  }

  function addMealOnDeck(date, entry) {
    const tempId = Date.now();
    setMealsOnDeck(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), { id: tempId, date, ...entry }],
    }));
    apiFetch('/api/meals/on-deck', {
      method: 'POST',
      body: JSON.stringify({ date, ...entry }),
    }).then(m => {
      setMealsOnDeck(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(x => x.id === tempId ? { ...x, id: m.id } : x),
      }));
    }).catch(console.error);
  }

  function removeMealOnDeck(date, entryId) {
    setMealsOnDeck(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(e => e.id !== entryId),
    }));
    apiFetch(`/api/meals/on-deck/${entryId}`, { method: 'DELETE' }).catch(console.error);
  }

  // ── Meal slots ───────────────────────────────────────────────────────────────

  function getMeal(dateStr, slot) {
    return (meals[dateStr] || {})[slot] || '';
  }

  function setMeal(dateStr, slot, value) {
    setMeals(prev => ({
      ...prev,
      [dateStr]: { ...(prev[dateStr] || {}), [slot]: value },
    }));
    apiFetch('/api/meals/slots', {
      method: 'PUT',
      body: JSON.stringify({ date: dateStr, slot, value }),
    }).catch(console.error);
  }

  // ── Meal library ─────────────────────────────────────────────────────────────

  function addMealToLibrary(meal) {
    const tempId = Date.now();
    setMealLibrary(prev => [...prev, { id: tempId, ...meal }]);
    apiFetch('/api/meals/library', {
      method: 'POST',
      body: JSON.stringify(meal),
    }).then(m => {
      setMealLibrary(prev => prev.map(x => x.id === tempId ? { ...x, id: m.id } : x));
    }).catch(console.error);
  }

  function updateMealInLibrary(id, meal) {
    setMealLibrary(prev => prev.map(m => m.id === id ? { ...m, ...meal } : m));
    apiFetch(`/api/meals/library/${id}`, { method: 'PUT', body: JSON.stringify(meal) }).catch(console.error);
  }

  function deleteMealFromLibrary(id) {
    setMealLibrary(prev => prev.filter(m => m.id !== id));
    apiFetch(`/api/meals/library/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // ── Shopping ─────────────────────────────────────────────────────────────────

  function addShoppingList(name) {
    const tempId = Date.now();
    setShoppingLists(prev => [...prev, { id: tempId, name, items: [] }]);
    apiFetch('/api/shopping/lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }).then(l => {
      setShoppingLists(prev => prev.map(x => x.id === tempId ? { ...x, id: l.id } : x));
    }).catch(console.error);
    return tempId;
  }

  function deleteShoppingList(id) {
    setShoppingLists(prev => prev.filter(l => l.id !== id));
    apiFetch(`/api/shopping/lists/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  function updateShoppingListName(id, name) {
    setShoppingLists(prev => prev.map(l => l.id === id ? { ...l, name } : l));
    apiFetch(`/api/shopping/lists/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }).catch(console.error);
  }

  function addShoppingItem(listId, item) {
    const tempId = Date.now();
    setShoppingLists(prev => prev.map(l =>
      l.id === listId ? { ...l, items: [...l.items, { id: tempId, checked: false, ...item }] } : l
    ));
    apiFetch(`/api/shopping/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }).then(i => {
      setShoppingLists(prev => prev.map(l =>
        l.id === listId
          ? { ...l, items: l.items.map(x => x.id === tempId ? { ...x, id: i.id } : x) }
          : l
      ));
    }).catch(console.error);
  }

  function toggleShoppingItem(listId, itemId) {
    setShoppingLists(prev => prev.map(l =>
      l.id === listId
        ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
        : l
    ));
    apiFetch(`/api/shopping/lists/${listId}/items/${itemId}/toggle`, { method: 'PUT' }).catch(console.error);
  }

  function deleteShoppingItem(listId, itemId) {
    setShoppingLists(prev => prev.map(l =>
      l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l
    ));
    apiFetch(`/api/shopping/lists/${listId}/items/${itemId}`, { method: 'DELETE' }).catch(console.error);
  }

  // ── Calendar ─────────────────────────────────────────────────────────────────

  function addUserCalendarEvent(event) {
    const tempId = Date.now();
    setUserCalendarEvents(prev => [...prev, { id: tempId, ...event }]);
    apiFetch('/api/calendar', {
      method: 'POST',
      body: JSON.stringify(event),
    }).then(e => {
      setUserCalendarEvents(prev => prev.map(x => x.id === tempId ? { ...x, id: e.id } : x));
    }).catch(console.error);
  }

  function updateUserCalendarEvent(id, changes) {
    setUserCalendarEvents(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
    apiFetch(`/api/calendar/${id}`, { method: 'PUT', body: JSON.stringify(changes) }).catch(console.error);
  }

  function deleteUserCalendarEvent(id) {
    setUserCalendarEvents(prev => prev.filter(e => e.id !== id));
    apiFetch(`/api/calendar/${id}`, { method: 'DELETE' }).catch(console.error);
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  function updateSettings(changes) {
    if (changes.hubName !== undefined) setHubName(changes.hubName);
    if (changes.countdownMode !== undefined) setCountdownMode(changes.countdownMode);
    if (changes.bgImage !== undefined) setBgImage(changes.bgImage);
    if (changes.printMode !== undefined) setPrintMode(changes.printMode);
    apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(changes) }).catch(console.error);
  }

  // ── Provider ─────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      authStatus, isAuthenticated, isOnboarding, onboardingData, currentMemberId,
      justSignedUp, setJustSignedUp,
      pendingInviteUrl, setPendingInviteUrl,
      calendarConnections, setCalendarConnections,
      signIn, startOnboarding, completeOnboarding, signOut,
      getAllMembers,
      screen, screenData, navigate,
      hubName, setHubName: v => updateSettings({ hubName: v }),
      chores, toggleChore, addChore, removeChore,
      tierOverrides, setTier, getTier,
      memberOverrides, updateMember, addMember,
      countdown, setCountdown, countdownMode, setCountdownMode,
      printMode, setPrintMode,
      getMember, getChores, doneCount, totalCount,
      choreLists, addChoreList, deleteChoreList, updateChoreListName,
      addChoreToList, removeChoreFromList, getChoreList,
      activeListEvent, assignListEvent, dismissListEvent, getListEventProgress,
      goals, getGoals, addGoal, removeGoal, toggleGoal,
      personalTodos, getPersonalTodos, addPersonalTodo, removePersonalTodo, togglePersonalTodo,
      parentPriorities, getParentPriorities, addParentPriority, removeParentPriority, toggleParentPriority,
      mealsOnDeck, getMealsOnDeck, addMealOnDeck, removeMealOnDeck,
      familyGoals, toggleFamilyGoal, addFamilyGoal, removeFamilyGoal, updateFamilyGoal,
      meals, getMeal, setMeal,
      mealLibrary, addMealToLibrary, updateMealInLibrary, deleteMealFromLibrary,
      stores, setStores: s => { setStores(s); apiFetch('/api/shopping/stores', { method: 'PUT', body: JSON.stringify({ stores: s }) }).catch(console.error); },
      shoppingLists, addShoppingList, deleteShoppingList, updateShoppingListName,
      addShoppingItem, toggleShoppingItem, deleteShoppingItem,
      userCalendarEvents, addUserCalendarEvent, updateUserCalendarEvent, deleteUserCalendarEvent,
      showDailyOverview, setShowDailyOverview,
      bgImage, setBgImage,
      updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
