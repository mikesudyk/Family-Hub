import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';
import { getColorClass } from '../data/calendar';
import { getStoreColor, groupByStore } from '../utils/storeColors';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

function formatTime(timeStr, use24h = false) {
  if (!timeStr || timeStr === 'All day') return timeStr || 'All day';
  if (/AM|PM/i.test(timeStr)) {
    if (!use24h) return timeStr;
    return timeStr.split('–').map(part => {
      const m = part.trim().match(/^(\d+)(?::(\d+))?\s*(AM|PM)$/i);
      if (!m) return part.trim();
      let h = parseInt(m[1]); const min = parseInt(m[2] || '0');
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      return `${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
    }).join('–');
  }
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return timeStr;
  if (use24h) return timeStr;
  const h = parseInt(match[1]); const m = parseInt(match[2]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function formatEventTime(event, use24h) {
  const t = event.time;
  if (!t || t === 'All day') return 'All day';
  if (/AM|PM/i.test(t)) return formatTime(t, use24h);
  const start = formatTime(t, use24h);
  if (event.endTime && event.endTime !== t) {
    return `${start}–${formatTime(event.endTime, use24h)}`;
  }
  return start;
}

function eventSortKey(event) {
  const t = event.time;
  if (!t || t === 'All day') return -1;
  const hhmm = t.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) return parseInt(hhmm[1]) * 60 + parseInt(hhmm[2]);
  const ampm = t.match(/^(\d+)(?::(\d+))?\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1]); const m = parseInt(ampm[2] || '0');
    if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return Infinity;
}
const MEAL_ICONS = { Breakfast: '🍳', Lunch: '🥪', Dinner: '🍽️' };

function dateStr(daysAhead) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function dayLabel(ds) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(ds + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return DAY_NAMES[d.getDay()];
}

function fullDateLabel(ds) {
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function MealChip({ dateStr, slot, getMeal, setMeal }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const value = getMeal(dateStr, slot);

  function save() {
    setMeal(dateStr, slot, draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-sm">{MEAL_ICONS[slot]}</span>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          placeholder={slot.toLowerCase()}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400"
        />
        <button onClick={save} className="text-xs text-blue-500 font-semibold bg-transparent border-none cursor-pointer">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">✕</button>
      </div>
    );
  }

  if (!value) return null;

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-left mt-1"
    >
      <span className="text-sm">{MEAL_ICONS[slot]}</span>
      <span className="text-xs text-gray-700">{value}</span>
      <span className="text-gray-300 text-xs ml-0.5">✏️</span>
    </button>
  );
}

function AddMealRow({ dateStr, getMeal, setMeal, autoOpen = false, onClose }) {
  const [slot, setSlot] = useState('Dinner');
  const [draft, setDraft] = useState('');

  const emptySlots = MEAL_SLOTS.filter(s => !getMeal(dateStr, s));
  if (emptySlots.length === 0) return null;

  function save() {
    const name = draft.trim();
    if (!name) return;
    setMeal(dateStr, slot, name);
    setDraft('');
    if (onClose) onClose();
  }

  if (!autoOpen) return null;

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={slot}
        onChange={e => setSlot(e.target.value)}
        className="bg-gray-50 rounded-lg px-1.5 py-0.5 text-xs border border-gray-200 outline-none cursor-pointer"
      >
        {emptySlots.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape' && onClose) onClose(); }}
        placeholder="What's for dinner?"
        className="flex-1 border border-gray-200 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400"
      />
      <button onClick={save} className="text-xs text-blue-500 font-semibold bg-transparent border-none cursor-pointer">Save</button>
      <button onClick={onClose} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">✕</button>
    </div>
  );
}

function DaySection({ ds, allEvents, getMeal, setMeal, addUserCalendarEvent, isLast, clock24h }) {
  const dayEvents = allEvents
    .filter(e => e.date === ds)
    .slice()
    .sort((a, b) => eventSortKey(a) - eventSortKey(b));
  const today = new Date().toISOString().split('T')[0];
  const isToday = ds === today;

  const [eventOpen, setEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [mealOpen, setMealOpen] = useState(false);

  function handleAddEvent() {
    const t = eventTitle.trim();
    if (!t) return;
    addUserCalendarEvent({ date: ds, title: t, time: eventTime.trim() || 'All day', color: 'gray', icon: '📅' });
    setEventTitle('');
    setEventTime('');
    setEventOpen(false);
  }

  return (
    <div>
      {/* Day header with inline add buttons */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-green-600' : 'text-gray-400'}`}>
          {dayLabel(ds)}
        </span>
        <span className="text-xs text-gray-300">{fullDateLabel(ds)}</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => { setMealOpen(o => !o); setEventOpen(false); }}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >+ meal</button>
          <button
            onClick={() => { setEventOpen(o => !o); setMealOpen(false); }}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >+ event</button>
        </div>
      </div>

      {/* Add event form */}
      {eventOpen && (
        <div className="mb-2 space-y-1.5">
          <input
            autoFocus
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
            placeholder="Event title"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
          />
          <input
            value={eventTime}
            onChange={e => setEventTime(e.target.value)}
            placeholder="Time (e.g. 3:00 PM) — optional"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
          />
          <div className="flex gap-2">
            <button onClick={() => { setEventOpen(false); setEventTitle(''); setEventTime(''); }} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
            <button onClick={handleAddEvent} className="text-xs text-blue-500 font-semibold bg-transparent border-none cursor-pointer">Add</button>
          </div>
        </div>
      )}

      {/* Add meal form */}
      {mealOpen && (
        <div className="mb-2">
          <AddMealRow dateStr={ds} getMeal={getMeal} setMeal={setMeal} onClose={() => setMealOpen(false)} autoOpen />
        </div>
      )}

      {/* Events */}
      {dayEvents.length > 0 && (
        <div className="space-y-1 mb-1">
          {dayEvents.map(event => (
            <div key={event.id} className="flex items-center gap-2.5">
              <span className="text-base leading-none w-5 text-center flex-shrink-0">{event.icon}</span>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="text-sm text-gray-800 truncate">{event.title}</span>
                {event.location && <span className="text-xs text-gray-400 truncate">{event.location}</span>}
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getColorClass(event.color)}`}>
                {formatEventTime(event, clock24h)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Meals */}
      <div className="mb-1">
        {MEAL_SLOTS.map(slot => (
          <MealChip key={slot} dateStr={ds} slot={slot} getMeal={getMeal} setMeal={setMeal} />
        ))}
      </div>

      {!isLast && <div className="h-px bg-gray-100 -mx-4 my-3" />}
    </div>
  );
}


function MealsOnDeck() {
  const { getMealsOnDeck, getMealsOnDeckHistory, addMealOnDeck, archiveMealOnDeck, removeMealOnDeck, mealLibrary } = useApp();
  const activeItems = getMealsOnDeck();
  const historyItems = getMealsOnDeckHistory();
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);

  const suggestions = query.length > 0
    ? mealLibrary.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  function handleAdd(title, libraryMeal = null) {
    const t = title.trim();
    if (!t) return;
    if (libraryMeal) {
      addMealOnDeck({ title: libraryMeal.title, fromLibrary: true, mealId: libraryMeal.id, ingredients: libraryMeal.ingredients || [] });
    } else {
      addMealOnDeck({ title: t, fromLibrary: false });
    }
    setQuery('');
    setAdding(false);
  }

  function formatArchivedDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <div className="bg-white rounded-2xl p-4 mb-4">
      <div className="flex items-center mb-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex-1">Meals on Deck</div>
        {historyItems.length > 0 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
          >
            {showHistory ? 'Hide History' : 'History'}
          </button>
        )}
      </div>

      {/* Active meals */}
      {activeItems.length === 0 && !adding && (
        <div className="text-xs text-gray-400 py-1 mb-1">No meals on deck. Add one below!</div>
      )}
      <div className="space-y-1.5 mb-2">
        {activeItems.map(entry => (
          <div key={entry.id} className="bg-gray-50 rounded-xl px-3 py-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-800 font-medium">{entry.title}</span>
                {entry.fromLibrary && entry.ingredients?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.ingredients.map((ing, i) => (
                      <span key={i} className="bg-white text-gray-500 text-xs px-1.5 py-0.5 rounded-md border border-gray-200 whitespace-nowrap">{ing}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => archiveMealOnDeck(entry.id)}
                  className="text-green-400 hover:text-green-600 bg-transparent border-none cursor-pointer text-base leading-none px-0.5"
                  title="Mark as done / archive"
                >✓</button>
                <button
                  onClick={() => removeMealOnDeck(entry.id)}
                  className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none"
                >×</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd(query);
              if (e.key === 'Escape') { setAdding(false); setQuery(''); }
            }}
            placeholder="Search library or type a meal…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
              {suggestions.map(meal => (
                <button
                  key={meal.id}
                  onMouseDown={() => handleAdd(meal.title, meal)}
                  className="w-full text-left px-3 py-2.5 border-none bg-transparent cursor-pointer hover:bg-gray-50"
                >
                  <div className="text-sm font-medium text-gray-800">{meal.title}</div>
                  {meal.ingredients?.length > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {meal.ingredients.slice(0, 4).join(', ')}{meal.ingredients.length > 4 ? '…' : ''}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => handleAdd(query)} className="text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg border-none cursor-pointer">Add</button>
            <button onClick={() => { setAdding(false); setQuery(''); }} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer">
          + Add meal
        </button>
      )}

      {/* History — past 3 weeks of archived meals */}
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-bold text-gray-400 mb-1.5">Past 3 Weeks</div>
          <div className="space-y-1.5">
            {historyItems.map(entry => (
              <div key={entry.id} className="flex items-center gap-2 opacity-70">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 font-medium">{entry.title}</div>
                  {entry.archivedAt && (
                    <div className="text-xs text-gray-400">{formatArchivedDate(entry.archivedAt)}</div>
                  )}
                </div>
                <button
                  onClick={() => removeMealOnDeck(entry.id)}
                  className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none flex-shrink-0"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingListPanel() {
  const { shoppingLists, stores, addShoppingItem, toggleShoppingItem, deleteShoppingItem, navigate } = useApp();
  const [selectedId, setSelectedId] = useState(shoppingLists[0]?.id || null);
  const [newItem, setNewItem] = useState('');
  const [newStore, setNewStore] = useState(stores[0] || '');
  const [newUrl, setNewUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const list = shoppingLists.find(l => l.id === selectedId);

  function handleAdd() {
    const name = newItem.trim();
    if (!name || !list) return;
    addShoppingItem(list.id, { name, store: newStore, url: newUrl.trim() });
    setNewItem('');
    setNewUrl('');
    setShowUrl(false);
  }

  if (shoppingLists.length === 0) {
    return (
      <div className="text-xs text-gray-400 text-center py-3">
        No lists yet.{' '}
        <button onClick={() => navigate('shopping-lists')} className="text-blue-500 bg-transparent border-none cursor-pointer font-semibold">
          Create one
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* List picker */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {shoppingLists.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedId(l.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-none cursor-pointer ${selectedId === l.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {list && (
        <>
          {/* Add item */}
          <div className="mb-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Add item…"
                className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-900 border border-gray-200 outline-none"
              />
              <select
                value={newStore}
                onChange={e => setNewStore(e.target.value)}
                className="bg-white rounded-lg px-2 py-1.5 text-xs text-gray-700 border border-gray-200 outline-none cursor-pointer"
              >
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={handleAdd} className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer">Add</button>
            </div>
            <div className="mt-1 px-0.5">
              {!showUrl ? (
                <button
                  onClick={() => setShowUrl(true)}
                  className="text-xs text-blue-500 font-semibold bg-transparent border-none cursor-pointer"
                >
                  + add url
                </button>
              ) : (
                <div className="flex gap-1.5 items-center mt-1">
                  <input
                    autoFocus
                    type="url"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="https://…"
                    className="flex-1 bg-white rounded-lg px-2.5 py-1.5 text-xs text-gray-900 border border-gray-200 outline-none"
                  />
                  <button
                    onClick={() => { setShowUrl(false); setNewUrl(''); }}
                    className="text-xs text-gray-400 bg-transparent border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Items grouped by store */}
          {list.items.length === 0 && <div className="text-xs text-gray-400 py-1">No items.</div>}
          {(() => {
            const groups = groupByStore(list.items, stores);
            return (
              <div className="space-y-2">
                {groups.map(({ store, items }) => {
                  const color = getStoreColor(store, stores);
                  const unchecked = items.filter(i => !i.checked);
                  const checked = items.filter(i => i.checked);
                  return (
                    <div key={store}>
                      <div className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white inline-block mb-1 ${color.badge}`}>{store}</div>
                      <div className="space-y-0.5">
                        {unchecked.map(item => (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${color.bg}`}>
                            <button
                              onClick={() => toggleShoppingItem(list.id, item.id)}
                              className="w-4 h-4 rounded-full border-2 flex-shrink-0 bg-transparent cursor-pointer"
                              style={{ borderColor: '#F5A624' }}
                            />
                            <span className={`flex-1 text-xs ${color.text} font-medium`}>{item.name}</span>
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`text-sm leading-none ${color.text} opacity-60 hover:opacity-100`}>↗</a>
                            )}
                            <button onClick={() => deleteShoppingItem(list.id, item.id)} className="text-gray-300 bg-transparent border-none cursor-pointer text-base leading-none">×</button>
                          </div>
                        ))}
                        {checked.map(item => (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${color.bg} opacity-50`}>
                            <button
                              onClick={() => toggleShoppingItem(list.id, item.id)}
                              className="w-4 h-4 rounded-full border-none flex-shrink-0 cursor-pointer bg-green-400"
                            />
                            <span className={`flex-1 text-xs ${color.text} line-through`}>{item.name}</span>
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`text-sm leading-none ${color.text} opacity-60`}>↗</a>
                            )}
                            <button onClick={() => deleteShoppingItem(list.id, item.id)} className="text-gray-300 bg-transparent border-none cursor-pointer text-base leading-none">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function formatPastDate(ds) {
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function PriorityList({ items, memberId, date, toggleParentPriority, removeParentPriority, readOnly = false }) {
  const active = items.filter(t => !t.done);
  const done   = items.filter(t => t.done);
  if (items.length === 0) return null;
  return (
    <>
      {active.length > 0 && (
        <div className="space-y-1.5 mb-1.5">
          {active.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <button
                onClick={() => !readOnly && toggleParentPriority(memberId, date, item.id)}
                className="w-4 h-4 rounded-full border-2 flex-shrink-0 bg-transparent cursor-pointer p-0"
                style={{ borderColor: '#F5A624' }}
              />
              <span className="flex-1 text-sm text-gray-800">{item.text}</span>
              {!readOnly && (
                <button onClick={() => removeParentPriority(memberId, date, item.id)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div className="space-y-1.5 mb-1.5">
          {done.map(item => (
            <div key={item.id} className="flex items-center gap-2 opacity-50">
              <button
                onClick={() => !readOnly && toggleParentPriority(memberId, date, item.id)}
                className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer border-none bg-green-400 p-0"
              />
              <span className="flex-1 text-sm line-through text-gray-400">{item.text}</span>
              {!readOnly && (
                <button onClick={() => removeParentPriority(memberId, date, item.id)} className="text-gray-300 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TopPriorities({ memberId }) {
  const { getParentPriorities, addParentPriority, removeParentPriority, toggleParentPriority } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const pastDates = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (i + 1));
    return d.toISOString().split('T')[0];
  });
  const todayItems = getParentPriorities(memberId, today);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    addParentPriority(memberId, today, text);
    setDraft('');
    setAdding(false);
  }

  return (
    <div className="bg-white rounded-2xl p-4 mb-4">
      {/* Header row */}
      <div className="flex items-center mb-2">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex-1">Today's Priorities</div>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer"
        >
          {showHistory ? 'Hide History' : 'History'}
        </button>
      </div>

      {/* Today */}
      {todayItems.length === 0 && !adding && (
        <div className="text-xs text-gray-400 py-1 mb-1">No priorities set for today.</div>
      )}
      <PriorityList
        items={todayItems}
        memberId={memberId}
        date={today}
        toggleParentPriority={toggleParentPriority}
        removeParentPriority={removeParentPriority}
      />

      {adding ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setDraft(''); } }}
            placeholder="What's the priority?"
            className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
          />
          <button onClick={handleAdd} className="text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg border-none cursor-pointer">Add</button>
          <button onClick={() => { setAdding(false); setDraft(''); }} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer mt-0.5">
          + Add priority
        </button>
      )}

      {/* History — past 3 days, read-only */}
      {showHistory && pastDates.map(date => {
        const items = getParentPriorities(memberId, date);
        return (
          <div key={date} className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-400 mb-1.5">{formatPastDate(date)}</div>
            <PriorityList
              items={items}
              memberId={memberId}
              date={date}
              toggleParentPriority={toggleParentPriority}
              removeParentPriority={removeParentPriority}
              readOnly
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ParentProfile({ memberId }) {
  const { navigate, getMember, getTier, getMeal, setMeal, userCalendarEvents, addUserCalendarEvent,
          getPersonalTodos, addPersonalTodo, removePersonalTodo, togglePersonalTodo, clock24h } = useApp();
  const member = getMember(memberId);
  const [showShopping, setShowShopping] = useState(false);
  const [addingTodo, setAddingTodo] = useState(false);
  const [todoText, setTodoText] = useState('');
  if (!member) return null;

  const tier = getTier(member);
  const days = Array.from({ length: 7 }, (_, i) => dateStr(i));

  const allEvents = userCalendarEvents;

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <BackButton to="hub" />
        <div className="flex-1">
          <div className="text-xl font-bold">{member.avatar} {member.name}</div>
          <div className="text-xs text-gray-500 capitalize">{tier}</div>
        </div>
        <button
          onClick={() => setShowShopping(s => !s)}
          className={`text-sm px-3 py-1.5 rounded-xl border-none cursor-pointer font-semibold ${showShopping ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          🛒 Lists
        </button>
      </div>

      {/* Shopping list panel */}
      {showShopping && (
        <div className="bg-white rounded-2xl p-3 mb-4">
          <ShoppingListPanel />
        </div>
      )}

      {!showShopping && (
        <>
          {/* Top Priorities */}
          <TopPriorities memberId={memberId} />

          {/* Meals on Deck + Personal To-Dos side by side on larger screens */}
          <div className="md:grid md:grid-cols-2 md:gap-4">
            <MealsOnDeck />
            {(() => {
        const todos = getPersonalTodos(memberId);
        const active = todos.filter(t => !t.done);
        const done   = todos.filter(t => t.done);
        return (
          <div className="bg-white rounded-2xl p-4 mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">My To-Dos</div>
            {todos.length === 0 && !addingTodo && (
              <div className="text-xs text-gray-400 py-1 mb-1">No to-dos yet.</div>
            )}
            {active.length > 0 && (
              <div className="space-y-1.5 mb-1.5">
                {active.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2">
                    <button
                      onClick={() => togglePersonalTodo(memberId, todo.id)}
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0 bg-transparent cursor-pointer p-0"
                      style={{ borderColor: '#F5A624' }}
                    />
                    <span className="flex-1 text-sm text-gray-800">{todo.text}</span>
                    <button onClick={() => removePersonalTodo(memberId, todo.id)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-1.5 mb-1.5">
                {done.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2 opacity-50">
                    <button
                      onClick={() => togglePersonalTodo(memberId, todo.id)}
                      className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer border-none bg-green-400 p-0"
                    />
                    <span className="flex-1 text-sm line-through text-gray-400">{todo.text}</span>
                    <button onClick={() => removePersonalTodo(memberId, todo.id)} className="text-gray-300 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
            {addingTodo ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  value={todoText}
                  onChange={e => setTodoText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && todoText.trim()) { addPersonalTodo(memberId, todoText.trim()); setTodoText(''); setAddingTodo(false); }
                    if (e.key === 'Escape') { setAddingTodo(false); setTodoText(''); }
                  }}
                  placeholder="What do you need to do?"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => { if (todoText.trim()) addPersonalTodo(memberId, todoText.trim()); setTodoText(''); setAddingTodo(false); }}
                  className="text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg border-none cursor-pointer"
                >Add</button>
                <button onClick={() => { setAddingTodo(false); setTodoText(''); }} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingTodo(true)} className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer mt-0.5">
                + Add to-do
              </button>
            )}
          </div>
        );
      })()}
          </div>
        </>
      )}

      {/* 7-day week view */}
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">This Week</div>
      <div className="bg-white rounded-xl px-4 py-3">
        {days.map((ds, i) => (
          <DaySection
            key={ds}
            ds={ds}
            allEvents={allEvents}
            getMeal={getMeal}
            setMeal={setMeal}
            addUserCalendarEvent={addUserCalendarEvent}
            isLast={i === days.length - 1}
            clock24h={clock24h}
          />
        ))}
      </div>
    </div>
  );
}
