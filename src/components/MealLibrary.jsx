import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';

export default function MealLibrary() {
  const { navigate, mealLibrary } = useApp();
  const [expanded, setExpanded] = useState(null);

  function toggle(id) {
    setExpanded(prev => prev === id ? null : id);
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div className="text-xl font-extrabold tracking-tight flex-1">Meal Library</div>
        <button
          onClick={() => navigate('meal-form', null)}
          className="bg-gray-900 text-white text-sm font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
        >
          + Add
        </button>
      </div>

      {mealLibrary.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
          No meals saved yet. Tap + Add to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {mealLibrary.map(meal => {
            const isOpen = expanded === meal.id;
            const shown = meal.ingredients?.slice(0, 7) || [];
            const extra = (meal.ingredients?.length || 0) - 7;
            return (
              <div key={meal.id} className="bg-white rounded-xl overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => toggle(meal.id)}
                  className="w-full text-left px-4 py-3 bg-transparent border-none cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm text-gray-900">{meal.title}</div>
                    <span className="text-gray-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {shown.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {shown.map((ing, i) => (
                        <span key={i} className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-md">{ing}</span>
                      ))}
                      {extra > 0 && (
                        <span className="text-xs text-gray-400 self-center">+{extra} more</span>
                      )}
                    </div>
                  )}
                </button>

                {/* Expanded recipe */}
                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="w-full h-px bg-gray-200 mb-3" />
                    {meal.image && (
                      <img src={meal.image} alt={meal.title} className="w-full h-40 object-cover rounded-xl mb-3" />
                    )}
                    {meal.recipe ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{meal.recipe}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No recipe added.</p>
                    )}
                    {meal.url && (
                      <a
                        href={meal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 block mt-2 truncate"
                        onClick={e => e.stopPropagation()}
                      >
                        {meal.url}
                      </a>
                    )}
                    <button
                      onClick={() => navigate('meal-form', meal.id)}
                      className="mt-3 text-xs font-semibold text-gray-500 bg-gray-200 rounded-lg px-3 py-1.5 border-none cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
