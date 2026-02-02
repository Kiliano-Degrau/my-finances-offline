import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { 
  Account, 
  getAccounts, 
  addAccount, 
  updateAccount, 
  deleteAccount,
  getAccountBalances
} from '@/lib/db';
import { formatCurrency } from '@/lib/currencies';
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
import { 
  Plus, Pencil, Trash2, Wallet, CreditCard, Landmark, 
  PiggyBank, Banknote, Building2, Coins, CircleDollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const availableIcons = [
  'Wallet', 'CreditCard', 'Landmark', 'PiggyBank', 
  'Banknote', 'Building2', 'Coins', 'CircleDollarSign'
];

const availableColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#64748B', '#6B7280'
];

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, CreditCard, Landmark, PiggyBank, 
  Banknote, Building2, Coins, CircleDollarSign
};

interface AccountManagementProps {
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  defaultCurrency?: string;
}

export default function AccountManagement({ open, onClose, onUpdate, defaultCurrency = 'BRL' }: AccountManagementProps) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, Record<string, number>>>({});
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [moveToAccount, setMoveToAccount] = useState<string>('');
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(availableColors[5]);
  const [formIcon, setFormIcon] = useState(availableIcons[0]);

  useEffect(() => {
    if (open) {
      loadAccounts();
    }
  }, [open]);

  const loadAccounts = async () => {
    const [accs, bals] = await Promise.all([
      getAccounts(),
      getAccountBalances()
    ]);
    setAccounts(accs);
    setBalances(bals);
  };

  const openNewForm = () => {
    setEditAccount(null);
    setFormName('');
    setFormColor(availableColors[5]);
    setFormIcon(availableIcons[0]);
    setShowForm(true);
  };

  const openEditForm = (acc: Account) => {
    setEditAccount(acc);
    setFormName(acc.name);
    setFormColor(acc.color);
    setFormIcon(acc.icon);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t('errors.required'));
      return;
    }

    if (editAccount) {
      await updateAccount(editAccount.id, {
        name: formName,
        color: formColor,
        icon: formIcon,
      });
      toast.success(t('settings.saved'));
    } else {
      await addAccount({
        name: formName,
        color: formColor,
        icon: formIcon,
        isDefault: false,
      });
      toast.success(t('settings.saved'));
    }

    setShowForm(false);
    loadAccounts();
    onUpdate?.();
  };

  const openDeleteDialog = (acc: Account) => {
    setDeleteTarget(acc);
    const defaultAcc = accounts.find(a => a.isDefault && a.id !== acc.id);
    setMoveToAccount(defaultAcc?.id || accounts.find(a => a.id !== acc.id)?.id || '');
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !moveToAccount) return;
    
    await deleteAccount(deleteTarget.id, moveToAccount);
    toast.success(t('settings.saved'));
    setShowDeleteDialog(false);
    setDeleteTarget(null);
    loadAccounts();
    onUpdate?.();
  };

  const getAccountName = (acc: Account) => {
    if (acc.isDefault && acc.name === 'defaultAccount') {
      return t('account.defaultAccount');
    }
    return acc.name;
  };

  const getAccountBalance = (accountId: string): number => {
    const accountBalances = balances[accountId];
    if (!accountBalances) return 0;
    // Return balance in default currency, or sum all if no default
    return accountBalances[defaultCurrency] || Object.values(accountBalances)[0] || 0;
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = iconComponents[iconName] || Wallet;
    return <IconComponent className={className} />;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t('account.title')}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-2 max-h-[65vh] overflow-auto">
            {accounts.map(acc => {
              const balance = getAccountBalance(acc.id);
              
              return (
                <div 
                  key={acc.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: acc.color }}
                    >
                      {renderIcon(acc.icon, 'h-6 w-6 text-white')}
                    </div>
                    <div>
                      <p className="font-medium">{getAccountName(acc)}</p>
                      <p className={`text-sm ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(Math.abs(balance), defaultCurrency)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditForm(acc)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!acc.isDefault && accounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(acc)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={openNewForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('account.addNew')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit/Add Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>
              {editAccount ? t('account.editAccount') : t('account.addNew')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label>{t('account.accountName')}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('account.accountName')}
                maxLength={50}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>{t('account.accountColor')}</Label>
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
              <Label>{t('account.accountIcon')}</Label>
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
              <span className="font-medium">{formName || t('account.accountName')}</span>
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
            <AlertDialogTitle>{t('account.deleteAccount')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('account.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4 space-y-2">
            <Label>{t('account.moveTransactions')}</Label>
            <Select value={moveToAccount} onValueChange={setMoveToAccount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter(a => a.id !== deleteTarget?.id)
                  .map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {getAccountName(acc)}
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