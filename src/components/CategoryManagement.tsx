import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { 
  Category, 
  getCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory 
} from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle,
  Circle, TrendingUp, Briefcase, Trophy, ShoppingBag,
  Utensils, Home, Heart, Gift, GraduationCap, Gamepad2,
  Zap, Plane, Car, Coffee, Music, Film, Book, Dumbbell,
  Shirt, Smartphone, CreditCard, Landmark
} from 'lucide-react';
import { toast } from 'sonner';

const availableIcons = [
  'Circle', 'TrendingUp', 'Briefcase', 'Trophy', 'ShoppingBag',
  'Utensils', 'Home', 'Heart', 'Gift', 'GraduationCap', 'Gamepad2',
  'Zap', 'Plane', 'Car', 'Coffee', 'Music', 'Film', 'Book', 'Dumbbell',
  'Shirt', 'Smartphone', 'CreditCard', 'Landmark'
];

const availableColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#64748B', '#6B7280'
];

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  Circle, TrendingUp, Briefcase, Trophy, ShoppingBag,
  Utensils, Home, Heart, Gift, GraduationCap, Gamepad2,
  Zap, Plane, Car, Coffee, Music, Film, Book, Dumbbell,
  Shirt, Smartphone, CreditCard, Landmark
};

interface CategoryManagementProps {
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function CategoryManagement({ open, onClose, onUpdate }: CategoryManagementProps) {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [moveToCategory, setMoveToCategory] = useState<string>('');
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(availableColors[0]);
  const [formIcon, setFormIcon] = useState(availableIcons[0]);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const openNewForm = (type: 'income' | 'expense') => {
    setEditCategory(null);
    setFormName('');
    setFormColor(availableColors[0]);
    setFormIcon(availableIcons[0]);
    setFormType(type);
    setShowForm(true);
  };

  const openEditForm = (cat: Category) => {
    setEditCategory(cat);
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormIcon(cat.icon);
    setFormType(cat.type);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t('errors.required'));
      return;
    }

    if (editCategory) {
      await updateCategory(editCategory.id, {
        name: formName,
        color: formColor,
        icon: formIcon,
      });
      toast.success(t('settings.saved'));
    } else {
      await addCategory({
        type: formType,
        name: formName,
        color: formColor,
        icon: formIcon,
        isDefault: false,
        isSystem: false,
      });
      toast.success(t('settings.saved'));
    }

    setShowForm(false);
    loadCategories();
    onUpdate?.();
  };

  const openDeleteDialog = (cat: Category) => {
    setDeleteTarget(cat);
    // Find default category to move transactions to
    const defaultCat = categories.find(c => c.type === cat.type && c.isDefault);
    setMoveToCategory(defaultCat?.id || '');
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !moveToCategory) return;
    
    await deleteCategory(deleteTarget.id, moveToCategory);
    toast.success(t('settings.saved'));
    setShowDeleteDialog(false);
    setDeleteTarget(null);
    loadCategories();
    onUpdate?.();
  };

  const getCategoryName = (cat: Category) => {
    if (cat.isSystem) {
      return t(`category.default.${cat.name}`);
    }
    return cat.name;
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = iconComponents[iconName] || Circle;
    return <IconComponent className={className} />;
  };

  const renderCategoryList = (categoryList: Category[], type: 'income' | 'expense') => (
    <div className="space-y-2">
      {categoryList.map(cat => (
        <div 
          key={cat.id}
          className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: cat.color }}
            >
              {renderIcon(cat.icon, 'h-5 w-5 text-white')}
            </div>
            <div>
              <p className="font-medium">{getCategoryName(cat)}</p>
              {cat.isSystem && (
                <p className="text-xs text-muted-foreground">{t('common.optional')}</p>
              )}
            </div>
          </div>
          {!cat.isDefault && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditForm(cat)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!cat.isSystem && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(cat)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
      
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => openNewForm(type)}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('category.addNew')}
      </Button>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t('category.title')}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expense" className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  {t('transaction.expense')}
                </TabsTrigger>
                <TabsTrigger value="income" className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  {t('transaction.income')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="expense" className="mt-4 max-h-[55vh] overflow-auto">
                {renderCategoryList(expenseCategories, 'expense')}
              </TabsContent>
              
              <TabsContent value="income" className="mt-4 max-h-[55vh] overflow-auto">
                {renderCategoryList(incomeCategories, 'income')}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit/Add Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>
              {editCategory ? t('category.editCategory') : t('category.addNew')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label>{t('category.categoryName')}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('category.categoryName')}
                maxLength={50}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>{t('category.categoryColor')}</Label>
              <div className="grid grid-cols-9 gap-2">
                {availableColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label>{t('category.categoryIcon')}</Label>
              <div className="grid grid-cols-8 gap-2">
                {availableIcons.map(icon => {
                  const IconComponent = iconComponents[icon];
                  return (
                    <button
                      key={icon}
                      onClick={() => setFormIcon(icon)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${
                        formIcon === icon 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted hover:border-muted-foreground'
                      }`}
                    >
                      {IconComponent && <IconComponent className="h-5 w-5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: formColor }}
              >
                {renderIcon(formIcon, 'h-6 w-6 text-white')}
              </div>
              <span className="font-medium">{formName || t('category.categoryName')}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('category.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('category.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4 space-y-2">
            <Label>{t('category.moveTransactions')}</Label>
            <Select value={moveToCategory} onValueChange={setMoveToCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter(c => c.type === deleteTarget?.type && c.id !== deleteTarget?.id)
                  .map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryName(cat)}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}