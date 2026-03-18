import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';
import { getStoreColor, groupByStore } from '../utils/storeColors';

export default function ShoppingListDetail() {
  const { screenData, shoppingLists, stores, addShoppingItem, toggleShoppingItem, deleteShoppingItem } = useApp();
  const list = shoppingLists.find(l => l.id === screenData);

  const [newItem, setNewItem] = useState('');
  const [newStore, setNewStore] = useState(stores[0] || '');
  const [newUrl, setNewUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  if (!list) return null;

  function handleAdd() {
    const name = newItem.trim();
    if (!name) return;
    addShoppingItem(list.id, { name, store: newStore, url: newUrl.trim() });
    setNewItem('');
    setNewUrl('');
    setShowUrl(false);
  }

  const groups = groupByStore(list.items, stores);

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="shopping-lists" />
        <div className="text-xl font-extrabold tracking-tight flex-1">{list.name}</div>
      </div>

      {/* Add item */}
      <div className="mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add item…"
            className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-900 border-none outline-none"
          />
          <select
            value={newStore}
            onChange={e => setNewStore(e.target.value)}
            className="bg-gray-50 rounded-xl px-2 py-2.5 text-sm text-gray-700 border-none outline-none cursor-pointer"
          >
            {stores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleAdd}
            className="bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl border-none cursor-pointer"
          >
            Add
          </button>
        </div>
        <div className="mt-1.5 px-1">
          {!showUrl ? (
            <button
              onClick={() => setShowUrl(true)}
              className="text-xs text-blue-500 font-semibold bg-transparent border-none cursor-pointer"
            >
              + add url
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="https://…"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 border-none outline-none"
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

      {/* Empty state */}
      {list.items.length === 0 && (
        <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">
          No items yet.
        </div>
      )}

      {/* Items grouped by store — checked items sink to the bottom of their section */}
      <div className="space-y-4">
        {groups.map(({ store, items }) => {
          const color = getStoreColor(store, stores);
          const unchecked = items.filter(i => !i.checked);
          const checked = items.filter(i => i.checked);
          return (
            <div key={store}>
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${color.badge}`}>
                  {store}
                </span>
              </div>
              <div className="space-y-1.5">
                {unchecked.map(item => (
                  <div key={item.id} className={`flex items-center gap-2 ${color.bg} rounded-xl px-3 py-2.5`}>
                    <button
                      onClick={() => toggleShoppingItem(list.id, item.id)}
                      className="w-5 h-5 rounded-full border-2 bg-transparent cursor-pointer flex-shrink-0"
                      style={{ borderColor: '#F5A624' }}
                    />
                    <span className={`flex-1 text-sm ${color.text} font-medium`}>{item.name}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`text-base leading-none ${color.text} opacity-60 hover:opacity-100`}>↗</a>
                    )}
                    <button onClick={() => deleteShoppingItem(list.id, item.id)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
                  </div>
                ))}
                {checked.map(item => (
                  <div key={item.id} className={`flex items-center gap-2 ${color.bg} rounded-xl px-3 py-2.5 opacity-50`}>
                    <button
                      onClick={() => toggleShoppingItem(list.id, item.id)}
                      className="w-5 h-5 rounded-full bg-green-400 border-none cursor-pointer flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm ${color.text} line-through`}>{item.name}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`text-base leading-none ${color.text} opacity-60`}>↗</a>
                    )}
                    <button onClick={() => deleteShoppingItem(list.id, item.id)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
