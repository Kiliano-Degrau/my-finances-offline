import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Check, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { Category, getCategories, getCategoriesByType, addCategory, updateCategory, deleteCategory } from '@/lib/db';

const CATEGORY_COLORS = [
  '#FF5555', '#FF79C6', '#FFB86C', '#F1FA8C', '#50FA7B',
  '#8BE9FD', '#BD93F9', '#6272A4', '#44475A', '#282A36',
  '#FF6E6E', '#FF92D0', '#FFCA85', '#F4FAA5', '#69FC94',
  '#A4ECFF', '#CAA4F9', '#7B8BB8', '#5D6274', '#3D4050',
];

const CATEGORY_ICONS = [
  'HelpCircle', 'TrendingUp', 'Briefcase', 'Award', 'ShoppingBag',
  'Utensils', 'Home', 'Cat', 'Dog', 'Gift', 'GraduationCap', 'Heart',
  'Gamepad2', 'Lightbulb', 'Plane', 'Car', 'Bus', 'Train', 'Bike',
  'Coffee', 'Pizza', 'Apple', 'Wine', 'Beer', 'Candy', 'Cake',
  'ShoppingCart', 'CreditCard', 'DollarSign', 'Banknote', 'Coins',
  'Wallet', 'Building', 'Factory', 'Store', 'Warehouse',
  'Smartphone', 'Laptop', 'Tv', 'Headphones', 'Camera',
  'Shirt', 'Watch', 'Glasses', 'Gem', 'Crown',
  'Stethoscope', 'Pill', 'Syringe', 'Activity', 'Dumbbell',
  'Book', 'BookOpen', 'Newspaper', 'PenTool', 'Palette',
  'Music', 'Film', 'Ticket', 'PartyPopper', 'Sparkles',
  'Sun', 'Moon', 'Cloud', 'Umbrella', 'Snowflake',
  'Flame', 'Droplet', 'Leaf', 'Trees', 'Flower2',
  'Baby', 'Users', 'Heart', 'HandHeart', 'Handshake',
  'Star', 'Zap', 'Target', 'Flag', 'Trophy',
];

interface CategorySelectorProps {
  open: boolean;
  onClose: () => void;
  type: 'income' | 'expense';
  selectedId: string;
  onSelect: (category: Category) => void;
}

export function CategorySelector({ open, onClose, type, selectedId, onSelect }: CategorySelectorProps) {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [newIcon, setNewIcon] = useState('HelpCircle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [moveToCategory, setMoveToCategory] = useState<string>('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open, type]);

  const loadCategories = async () => {
    const cats = await getCategoriesByType(type);
    setCategories(cats);
  };

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    return categories.filter(c => {
      const name = c.isSystem ? t(`category.default.${c.name}`) : c.name;
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [categories, search, t]);

  const getCategoryName = (cat: Category) => {
    if (cat.isSystem) {
      return t(`category.default.${cat.name}`);
    }
    return cat.name;
  };

  const handleSelect = (cat: Category) => {
    if (editMode) return;
    onSelect(cat);
    onClose();
  };

  const handleLongPressStart = (cat: Category) => {
    if (cat.isDefault) return;
    const timer = setTimeout(() => {
      setEditingCategory(cat);
      setNewName(cat.isSystem ? t(`category.default.${cat.name}`) : cat.name);
      setNewColor(cat.color);
      setNewIcon(cat.icon);
      setEditMode(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleSaveCategory = async () => {
    if (!newName.trim()) return;

    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: newName,
        color: newColor,
        icon: newIcon,
        isSystem: false,
      });
    } else {
      await addCategory({
        name: newName,
        type,
        color: newColor,
        icon: newIcon,
        isDefault: false,
        isSystem: false,
      });
    }

    await loadCategories();
    resetForm();
  };

  const handleDelete = async () => {
    if (!editingCategory || !moveToCategory) return;
    await deleteCategory(editingCategory.id, moveToCategory);
    await loadCategories();
    resetForm();
    setShowDeleteConfirm(false);
  };

  const resetForm = () => {
    setEditMode(false);
    setEditingCategory(null);
    setShowNewForm(false);
    setNewName('');
    setNewColor(CATEGORY_COLORS[0]);
    setNewIcon('HelpCircle');
  };

  const renderIcon = (iconName: string, color: string, size: number = 20) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return <Icon size={size} color="white" />;
  };

  const renderCategoryList = () => (
    <>
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle>{t('category.selectCategory')}</SheetTitle>
      </SheetHeader>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat)}
              onTouchStart={() => handleLongPressStart(cat)}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(cat)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors touch-feedback ${
                selectedId === cat.id
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-secondary/50 hover:bg-secondary'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: cat.color }}
              >
                {renderIcon(cat.icon, cat.color)}
              </div>
              <span className="flex-1 text-left font-medium">{getCategoryName(cat)}</span>
              {selectedId === cat.id && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => {
            setShowNewForm(true);
            setEditMode(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('category.addNew')}
        </Button>
      </div>
    </>
  );

  const renderForm = () => (
    <>
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle>
          {editingCategory ? t('category.editCategory') : t('category.addNew')}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-6">
        {/* Preview */}
        <div className="flex items-center justify-center py-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: newColor }}
          >
            {renderIcon(newIcon, newColor, 36)}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('category.categoryName')}</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('category.categoryName')}
            maxLength={50}
            className="mt-1"
          />
        </div>

        {/* Colors */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('category.categoryColor')}</label>
          <div className="grid grid-cols-10 gap-2 mt-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`w-8 h-8 rounded-full transition-all ${
                  newColor === color ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Icons */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('category.categoryIcon')}</label>
          <div className="grid grid-cols-8 gap-2 mt-2 max-h-48 overflow-auto">
            {CATEGORY_ICONS.map((iconName) => {
              const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
              return (
                <button
                  key={iconName}
                  onClick={() => setNewIcon(iconName)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    newIcon === iconName
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Delete button for editing */}
        {editingCategory && !editingCategory.isDefault && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              const defaultCat = categories.find(c => c.isDefault);
              if (defaultCat) setMoveToCategory(defaultCat.id);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('category.deleteCategory')}
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-3 safe-bottom">
        <Button variant="outline" className="flex-1" onClick={resetForm}>
          {t('common.cancel')}
        </Button>
        <Button className="flex-1" onClick={handleSaveCategory} disabled={!newName.trim()}>
          {t('common.save')}
        </Button>
      </div>
    </>
  );

  const renderDeleteConfirm = () => (
    <>
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle>{t('category.deleteCategory')}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
        <p className="text-muted-foreground">{t('category.deleteConfirm')}</p>
        <p className="text-sm font-medium">{t('category.moveTransactions')}</p>
        
        <div className="space-y-2">
          {categories
            .filter(c => c.id !== editingCategory?.id)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setMoveToCategory(cat.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  moveToCategory === cat.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-secondary/50 hover:bg-secondary'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: cat.color }}
                >
                  {renderIcon(cat.icon, cat.color, 16)}
                </div>
                <span className="flex-1 text-left">{getCategoryName(cat)}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="p-4 border-t border-border flex gap-3 safe-bottom">
        <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleDelete}
          disabled={!moveToCategory}
        >
          {t('common.delete')}
        </Button>
      </div>
    </>
  );

  return (
    <Sheet open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        {showDeleteConfirm
          ? renderDeleteConfirm()
          : editMode
          ? renderForm()
          : renderCategoryList()}
      </SheetContent>
    </Sheet>
  );
}
