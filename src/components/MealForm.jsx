import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BackButton } from './ui';

export default function MealForm() {
  const { navigate, screenData, mealLibrary, addMealToLibrary, updateMealInLibrary, deleteMealFromLibrary } = useApp();

  const existing = screenData ? mealLibrary.find(m => m.id === screenData) : null;

  const [title, setTitle]       = useState(existing?.title || '');
  const [ingredients, setIngredients] = useState(existing?.ingredients || []);
  const [newIngredient, setNewIngredient] = useState('');
  const [url, setUrl]           = useState(existing?.url || '');
  const [recipe, setRecipe]     = useState(existing?.recipe || '');
  const [image, setImage]         = useState(existing?.image || null);
  const [uploading, setUploading] = useState(false);

  async function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/uploads/image`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setImage(url);
    } catch (err) {
      console.error(err);
      alert('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function addIngredient() {
    const val = newIngredient.trim();
    if (!val) return;
    setIngredients(prev => [...prev, val]);
    setNewIngredient('');
  }

  function removeIngredient(i) {
    setIngredients(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleIngredientKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addIngredient(); }
  }

  function handleSave() {
    if (!title.trim()) return;
    const data = { title, ingredients, url, recipe, image };
    if (existing) {
      updateMealInLibrary(existing.id, data);
    } else {
      addMealToLibrary(data);
    }
    navigate('meal-library');
  }

  function handleDelete() {
    deleteMealFromLibrary(existing.id);
    navigate('meal-library');
  }

  const inputClass = "w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 border-none outline-none";
  const labelClass = "text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-4 block";

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="meal-library" />
        <div className="text-xl font-extrabold tracking-tight flex-1">
          {existing ? 'Edit Meal' : 'New Meal'}
        </div>
        {existing && (
          <button
            onClick={handleDelete}
            className="text-red-400 text-sm font-semibold bg-transparent border-none cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>

      {/* Photo */}
      <label className={labelClass}>Photo</label>
      {uploading ? (
        <div className="flex items-center justify-center w-full h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm mb-1">
          Uploading…
        </div>
      ) : image ? (
        <div className="relative mb-2">
          <img src={image} alt="Meal" className="w-full h-40 object-cover rounded-xl" />
          <button
            onClick={() => setImage(null)}
            className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs font-semibold px-2 py-1 rounded-lg border-none cursor-pointer"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-full h-24 bg-gray-50 rounded-xl cursor-pointer border-2 border-dashed border-gray-200 text-gray-400 text-sm gap-2 mb-1">
          <span>📷 Add photo</span>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
      )}

      <label className={labelClass}>Title</label>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Chicken Alfredo"
        className={inputClass}
      />

      <label className={labelClass}>Ingredients</label>
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {ingredients.map((ing, i) => (
            <span key={i} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-700">
              {ing}
              <button
                onClick={() => removeIngredient(i)}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer leading-none text-sm"
              >×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={newIngredient}
          onChange={e => setNewIngredient(e.target.value)}
          onKeyDown={handleIngredientKeyDown}
          placeholder="Add ingredient…"
          className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 border-none outline-none"
        />
        <button
          onClick={addIngredient}
          className="bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl border-none cursor-pointer"
        >
          Add
        </button>
      </div>

      <label className={labelClass}>Recipe URL</label>
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://..."
        className={inputClass}
      />

      <label className={labelClass}>Recipe</label>
      <textarea
        value={recipe}
        onChange={e => setRecipe(e.target.value)}
        placeholder="Step-by-step instructions..."
        rows={6}
        className={`${inputClass} resize-none`}
      />

      <button
        onClick={handleSave}
        disabled={!title.trim() || uploading}
        className="w-full bg-gray-900 text-white font-bold text-base rounded-2xl py-4 cursor-pointer border-none mt-6 disabled:opacity-40"
      >
        {existing ? 'Save Changes' : 'Add Meal'}
      </button>
    </div>
  );
}
