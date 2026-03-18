import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton, SectionLabel } from './ui';
import { getStoreColor, groupByStore } from '../utils/storeColors';

function ListCard({ list }) {
  const { stores, addShoppingItem, toggleShoppingItem, deleteShoppingItem, deleteShoppingList } = useApp();
  const [open, setOpen] = useState(list.name === 'Grocery');
  const [newItem, setNewItem] = useState('');
  const [newStore, setNewStore] = useState(stores[0] || '');
  const [newUrl, setNewUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);

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
    <div className="bg-white rounded-2xl overflow-hidden mb-3">
      {/* Card header — tap to expand/collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none cursor-pointer text-left"
      >
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">{list.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{list.items.length} item{list.items.length !== 1 ? 's' : ''}</div>
        </div>
        <span className={`text-gray-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
        <button
          onClick={e => { e.stopPropagation(); deleteShoppingList(list.id); }}
          className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg leading-none ml-1"
        >×</button>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {/* Add item form */}
          <div className="mb-3">
            <div className="flex gap-2">
              <input
                autoFocus={list.name === 'Grocery'}
                type="text"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Add item…"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 border-none outline-none"
              />
              <select
                value={newStore}
                onChange={e => setNewStore(e.target.value)}
                className="bg-gray-50 rounded-xl px-2 py-2 text-sm text-gray-700 border-none outline-none cursor-pointer"
              >
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={handleAdd}
                className="bg-gray-900 text-white text-sm font-semibold px-3 py-2 rounded-xl border-none cursor-pointer"
              >Add</button>
            </div>
            <div className="mt-1.5 px-1">
              {!showUrl ? (
                <button
                  onClick={() => setShowUrl(true)}
                  className="text-xs text-blue-500 font-semibold bg-transparent border-none cursor-pointer"
                >+ add url</button>
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
                  <button onClick={() => { setShowUrl(false); setNewUrl(''); }} className="text-xs text-gray-400 bg-transparent border-none cursor-pointer">Cancel</button>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {list.items.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-2">No items yet.</div>
          ) : (
            <div className="space-y-3">
              {groups.map(({ store, items }) => {
                const color = getStoreColor(store, stores);
                const unchecked = items.filter(i => !i.checked);
                const checked = items.filter(i => i.checked);
                return (
                  <div key={store}>
                    <div className="mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${color.badge}`}>{store}</span>
                    </div>
                    <div className="space-y-1">
                      {unchecked.map(item => (
                        <div key={item.id} className={`flex items-center gap-2 ${color.bg} rounded-xl px-3 py-2`}>
                          <button onClick={() => toggleShoppingItem(list.id, item.id)} className="w-4 h-4 rounded-full border-2 bg-transparent cursor-pointer flex-shrink-0" style={{ borderColor: '#F5A624' }} />
                          <span className={`flex-1 text-sm ${color.text} font-medium`}>{item.name}</span>
                          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`text-sm leading-none ${color.text} opacity-60 hover:opacity-100`}>↗</a>}
                          <button onClick={() => deleteShoppingItem(list.id, item.id)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-base leading-none">×</button>
                        </div>
                      ))}
                      {checked.map(item => (
                        <div key={item.id} className={`flex items-center gap-2 ${color.bg} rounded-xl px-3 py-2 opacity-50`}>
                          <button onClick={() => toggleShoppingItem(list.id, item.id)} className="w-4 h-4 rounded-full bg-green-400 border-none cursor-pointer flex-shrink-0" />
                          <span className={`flex-1 text-sm ${color.text} line-through`}>{item.name}</span>
                          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`text-sm leading-none ${color.text} opacity-60`}>↗</a>}
                          <button onClick={() => deleteShoppingItem(list.id, item.id)} className="text-gray-300 hover:text-red-400 bg-transparent border-none cursor-pointer text-base leading-none">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShoppingLists() {
  const { shoppingLists, addShoppingList, stores, setStores } = useApp();
  const [newName, setNewName] = useState('');
  const [newStore, setNewStore] = useState('');
  const [editingStores, setEditingStores] = useState(false);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addShoppingList(name);
    setNewName('');
  }

  function handleAddStore() {
    const s = newStore.trim();
    if (!s || stores.includes(s)) return;
    setStores(prev => [...prev, s]);
    setNewStore('');
  }

  function handleRemoveStore(s) {
    setStores(prev => prev.filter(x => x !== s));
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Shopping Lists</div>
      </div>

      {/* Lists */}
      {shoppingLists.map(list => (
        <ListCard key={list.id} list={list} />
      ))}

      {/* Add new list */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="New list name…"
          className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-900 border-none outline-none"
        />
        <button
          onClick={handleAdd}
          className="bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl border-none cursor-pointer"
        >Add</button>
      </div>

      {/* Stores */}
      <div className="flex items-center justify-between mb-1 mt-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stores</div>
        <button onClick={() => setEditingStores(e => !e)} className="text-xs font-semibold text-blue-500 bg-transparent border-none cursor-pointer">
          {editingStores ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {stores.map(s => {
          const color = getStoreColor(s, stores);
          return (
            <span key={s} className={`flex items-center gap-1 ${color.bg} ${color.text} text-xs px-2.5 py-1 rounded-lg font-semibold`}>
              {s}
              {editingStores && (
                <button onClick={() => handleRemoveStore(s)} className="text-current opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer leading-none">×</button>
              )}
            </span>
          );
        })}
      </div>
      {editingStores && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newStore}
            onChange={e => setNewStore(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddStore()}
            placeholder="Add store…"
            className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 border-none outline-none"
          />
          <button onClick={handleAddStore} className="bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl border-none cursor-pointer">Add</button>
        </div>
      )}
    </div>
  );
}
