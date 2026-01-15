import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Check, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { Account, getAllAccounts, addAccount, updateAccount, deleteAccount } from '@/lib/db';

const ACCOUNT_COLORS = [
  '#BD93F9', '#FF79C6', '#8BE9FD', '#50FA7B', '#FFB86C',
  '#FF5555', '#F1FA8C', '#6272A4', '#44475A', '#282A36',
];

const ACCOUNT_ICONS = [
  'Wallet', 'CreditCard', 'Banknote', 'Building', 'PiggyBank',
  'Landmark', 'CircleDollarSign', 'BadgeDollarSign', 'Coins', 'HandCoins',
  'Vault', 'Safe', 'Receipt', 'FileText', 'Folder',
];

interface AccountSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedId: string;
  onSelect: (account: Account) => void;
}

export function AccountSelector({ open, onClose, selectedId, onSelect }: AccountSelectorProps) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(ACCOUNT_COLORS[0]);
  const [newIcon, setNewIcon] = useState('Wallet');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [moveToAccount, setMoveToAccount] = useState<string>('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      loadAccounts();
    }
  }, [open]);

  const loadAccounts = async () => {
    const accs = await getAllAccounts();
    setAccounts(accs);
  };

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    return accounts.filter(a => {
      const name = a.isDefault && a.name === 'defaultAccount' ? t('account.defaultAccount') : a.name;
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [accounts, search, t]);

  const getAccountName = (acc: Account) => {
    if (acc.isDefault && acc.name === 'defaultAccount') {
      return t('account.defaultAccount');
    }
    return acc.name;
  };

  const handleSelect = (acc: Account) => {
    if (editMode) return;
    onSelect(acc);
    onClose();
  };

  const handleLongPressStart = (acc: Account) => {
    const timer = setTimeout(() => {
      setEditingAccount(acc);
      setNewName(acc.isDefault && acc.name === 'defaultAccount' ? t('account.defaultAccount') : acc.name);
      setNewColor(acc.color);
      setNewIcon(acc.icon);
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

  const handleSaveAccount = async () => {
    if (!newName.trim()) return;

    if (editingAccount) {
      await updateAccount({
        ...editingAccount,
        name: newName,
        color: newColor,
        icon: newIcon,
      });
    } else {
      await addAccount({
        name: newName,
        color: newColor,
        icon: newIcon,
        isDefault: false,
      });
    }

    await loadAccounts();
    resetForm();
  };

  const handleDelete = async () => {
    if (!editingAccount || !moveToAccount) return;
    await deleteAccount(editingAccount.id, moveToAccount);
    await loadAccounts();
    resetForm();
    setShowDeleteConfirm(false);
  };

  const resetForm = () => {
    setEditMode(false);
    setEditingAccount(null);
    setShowNewForm(false);
    setNewName('');
    setNewColor(ACCOUNT_COLORS[0]);
    setNewIcon('Wallet');
  };

  const renderIcon = (iconName: string, size: number = 20) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Wallet;
    return <Icon size={size} color="white" />;
  };

  const renderAccountList = () => (
    <>
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle>{t('account.selectAccount')}</SheetTitle>
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
          {filteredAccounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => handleSelect(acc)}
              onTouchStart={() => handleLongPressStart(acc)}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(acc)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors touch-feedback ${
                selectedId === acc.id
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-secondary/50 hover:bg-secondary'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: acc.color }}
              >
                {renderIcon(acc.icon)}
              </div>
              <span className="flex-1 text-left font-medium">{getAccountName(acc)}</span>
              {selectedId === acc.id && (
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
          {t('account.addNew')}
        </Button>
      </div>
    </>
  );

  const renderForm = () => (
    <>
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle>
          {editingAccount ? t('account.editAccount') : t('account.addNew')}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-6">
        {/* Preview */}
        <div className="flex items-center justify-center py-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: newColor }}
          >
            {renderIcon(newIcon, 36)}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('account.accountName')}</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('account.accountName')}
            maxLength={50}
            className="mt-1"
          />
        </div>

        {/* Colors */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">{t('account.accountColor')}</label>
          <div className="grid grid-cols-10 gap-2 mt-2">
            {ACCOUNT_COLORS.map((color) => (
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
          <label className="text-sm font-medium text-muted-foreground">{t('account.accountIcon')}</label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {ACCOUNT_ICONS.map((iconName) => {
              const Icon = (LucideIcons as any)[iconName] || LucideIcons.Wallet;
              return (
                <button
                  key={iconName}
                  onClick={() => setNewIcon(iconName)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                    newIcon === iconName
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <Icon size={24} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Delete button for editing (except default) */}
        {editingAccount && !editingAccount.isDefault && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              const defaultAcc = accounts.find(a => a.isDefault);
              if (defaultAcc) setMoveToAccount(defaultAcc.id);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('account.deleteAccount')}
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-3 safe-bottom">
        <Button variant="outline" className="flex-1" onClick={resetForm}>
          {t('common.cancel')}
        </Button>
        <Button className="flex-1" onClick={handleSaveAccount} disabled={!newName.trim()}>
          {t('common.save')}
        </Button>
      </div>
    </>
  );

  const renderDeleteConfirm = () => (
    <>
      <SheetHeader className="px-4 pt-4 pb-2">
        <SheetTitle>{t('account.deleteAccount')}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
        <p className="text-muted-foreground">{t('account.deleteConfirm')}</p>
        <p className="text-sm font-medium">{t('account.moveTransactions')}</p>
        
        <div className="space-y-2">
          {accounts
            .filter(a => a.id !== editingAccount?.id)
            .map((acc) => (
              <button
                key={acc.id}
                onClick={() => setMoveToAccount(acc.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  moveToAccount === acc.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-secondary/50 hover:bg-secondary'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: acc.color }}
                >
                  {renderIcon(acc.icon, 16)}
                </div>
                <span className="flex-1 text-left">{getAccountName(acc)}</span>
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
          disabled={!moveToAccount}
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
          : renderAccountList()}
      </SheetContent>
    </Sheet>
  );
}
