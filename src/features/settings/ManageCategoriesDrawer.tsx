import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { X, Eye, EyeOff } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { Category } from '../../services/category.service';

interface ManageCategoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageCategoriesDrawer({ isOpen, onClose }: ManageCategoriesDrawerProps) {
  const { categories, settings, toggleCategoryVisibility } = useFinancialEngine();
  const hiddenCategoryIds = settings?.hiddenCategoryIds || [];
  
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return Icon;
  };

  const handleToggle = async (categoryId: string) => {
    if (isToggling) return;
    setIsToggling(categoryId);
    try {
      await toggleCategoryVisibility(categoryId);
    } finally {
      setIsToggling(null);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]" />
        <Drawer.Content 
          className="bg-card flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[111] max-w-[428px] mx-auto shadow-2xl"
        >
          <div className="p-5 bg-card rounded-t-[40px] flex flex-col items-center shrink-0 border-b border-border">
            <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
            <div className="w-full flex justify-between items-center px-2">
              <Drawer.Title className="text-3xl font-bold text-foreground">Categories</Drawer.Title>
              <button onClick={onClose} className="p-2 bg-muted rounded-full text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <p className="w-full px-2 mt-2 text-sm text-muted-foreground font-medium">
              Tap the eye icon to hide or show categories when adding a new transaction.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
            <div className="grid grid-cols-1 gap-3">
              {categories.map((cat) => {
                const Icon = getIcon(cat.icon);
                const isHidden = hiddenCategoryIds.includes(cat.categoryId);
                const isLoading = isToggling === cat.categoryId;

                return (
                  <div
                    key={cat.categoryId}
                    className={`bg-card p-4 rounded-2xl shadow-neu-extrude border border-border flex items-center gap-4 transition-all ${
                      isHidden ? 'opacity-50 grayscale' : 'hover:shadow-md'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-lg truncate ${isHidden ? 'text-gray-400' : 'text-foreground'}`}>
                        {cat.name}
                      </h4>
                      {cat.description && (
                        <p className={`text-sm truncate ${isHidden ? 'text-gray-400' : 'text-muted-foreground'}`}>
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle(cat.categoryId)}
                      disabled={isToggling !== null}
                      className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
                        isHidden ? 'bg-muted text-muted-foreground hover:bg-border' : 'bg-primary/10 text-foreground hover:bg-primary/20'
                      }`}
                      aria-label={isHidden ? "Show category" : "Hide category"}
                    >
                      {isLoading ? (
                         <div className="w-5 h-5 border-2 border-primary/30 border-t-[#355C7D] rounded-full animate-spin" />
                      ) : isHidden ? (
                        <EyeOff size={22} />
                      ) : (
                        <Eye size={22} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
