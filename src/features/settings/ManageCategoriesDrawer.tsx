import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { X, Check, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { COLORS } from '../../constants';
import { Category } from '../../services/category.service';

interface ManageCategoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'ShoppingBag', 'Coffee', 'Train', 'Home', 'User', 'Film', 'HeartPulse', 'Book', 'ArrowDownCircle',
  'Car', 'Smartphone', 'Wifi', 'Gift', 'Utensils', 'Briefcase', 'Music', 'Plane', 'ShoppingCart',
  'Monitor', 'Scissors', 'Gamepad2', 'Cpu', 'Activity', 'Anchor', 'Aperture'
];

export function ManageCategoriesDrawer({ isOpen, onClose }: ManageCategoriesDrawerProps) {
  const { categories, updateCategory, deleteCategory } = useFinancialEngine();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Edit state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return Icon;
  };

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setEditIcon(cat.icon);
    setEditColor(cat.color);
  };

  const handleCloseEdit = () => {
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!editingCategory || !editName.trim()) return;
    setIsSaving(true);
    try {
      await updateCategory(editingCategory.categoryId, {
        name: editName.trim(),
        description: editDesc.trim(),
        icon: editIcon,
        color: editColor
      });
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCategory) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete the "${editingCategory.name}" category?`);
    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      await deleteCategory(editingCategory.categoryId);
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]" />
          <Drawer.Content 
            className="bg-[#F9FAFB] flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[111] max-w-[428px] mx-auto shadow-2xl"
            onInteractOutside={(e) => {
              if (editingCategory) e.preventDefault();
            }}
          >
            <div className="p-5 bg-white rounded-t-[40px] flex flex-col items-center shrink-0 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
              <div className="w-full flex justify-between items-center px-2">
                <Drawer.Title className="text-3xl font-bold text-[#355C7D]">Categories</Drawer.Title>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-[#6C5B7B]">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat) => {
                  const Icon = getIcon(cat.icon);
                  return (
                    <button
                      key={cat.categoryId}
                      onClick={() => handleEditClick(cat)}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <Icon size={24} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#355C7D] text-lg truncate">{cat.name}</h4>
                        {cat.description && (
                          <p className="text-sm text-[#6C5B7B] truncate">{cat.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Edit Modal (Inline Drawer overlay approach for simplicity) */}
      <Drawer.Root open={!!editingCategory} onOpenChange={(open) => !open && handleCloseEdit()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[121] max-w-[428px] mx-auto shadow-2xl">
            <div className="p-5 flex flex-col items-center shrink-0 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
              <div className="w-full flex justify-between items-center px-2">
                <h2 className="text-2xl font-bold text-[#355C7D]">Edit Category</h2>
                <button onClick={handleCloseEdit} className="p-2 bg-gray-100 rounded-full text-[#6C5B7B]">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#6C5B7B]">Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-[#F3F1EA] rounded-[16px] px-5 py-3.5 text-[#355C7D] font-bold outline-none border border-transparent focus:border-[#355C7D]/20 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#6C5B7B]">Description</label>
                <input 
                  type="text" 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full bg-[#F3F1EA] rounded-[16px] px-5 py-3.5 text-[#355C7D] font-medium outline-none border border-transparent focus:border-[#355C7D]/20 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[#6C5B7B]">Color</label>
                <div className="flex flex-wrap gap-3">
                  {Object.values(COLORS).filter(c => c.startsWith('#')).map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${editColor === color ? 'scale-110 shadow-md ring-2 ring-offset-2 ring-[#355C7D]' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    >
                      {editColor === color && <Check size={16} className="text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[#6C5B7B]">Icon</label>
                <div className="grid grid-cols-5 gap-3">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const Icon = getIcon(iconName);
                    return (
                      <button
                        key={iconName}
                        onClick={() => setEditIcon(iconName)}
                        className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${
                          editIcon === iconName 
                            ? 'bg-[#355C7D] text-white shadow-md scale-105' 
                            : 'bg-[#F3F1EA] text-[#6C5B7B] hover:bg-gray-200'
                        }`}
                      >
                        <Icon size={24} strokeWidth={editIcon === iconName ? 2.5 : 2} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isSaving || editingCategory?.isDefault}
                className={`p-4 rounded-[20px] bg-red-50 text-red-500 font-bold flex items-center justify-center transition-colors ${editingCategory?.isDefault ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'}`}
                title={editingCategory?.isDefault ? "Default categories cannot be deleted" : "Delete category"}
              >
                <Trash2 size={24} />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
                className="flex-1 py-4 bg-[#355C7D] text-white rounded-[20px] text-[16px] font-bold shadow-[0_8px_24px_rgba(53,92,125,0.25)] hover:bg-[#2a4a65] disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={20} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
