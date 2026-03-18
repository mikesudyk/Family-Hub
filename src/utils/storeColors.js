const STORE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', badge: 'bg-violet-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', badge: 'bg-rose-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', badge: 'bg-amber-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', badge: 'bg-pink-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', badge: 'bg-teal-500' },
];

export function getStoreColor(store, stores) {
  const idx = stores.indexOf(store);
  return STORE_COLORS[(idx === -1 ? 0 : idx) % STORE_COLORS.length];
}

export function groupByStore(items, stores) {
  const groups = stores
    .map(s => ({ store: s, items: items.filter(i => i.store === s) }))
    .filter(g => g.items.length > 0);
  const unknown = items.filter(i => !stores.includes(i.store));
  if (unknown.length > 0) groups.push({ store: 'Other', items: unknown });
  return groups;
}
