import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useI18n } from '@/lib/i18n';
import { getSettings, updateSettings, UserSettings, getDB, Transaction, Category, Account } from '@/lib/db';
import { currencies } from '@/lib/currencies';
import { usePWA } from '@/hooks/usePWA';
import { useBiometrics } from '@/hooks/useBiometrics';
import { 
  ChevronLeft, Globe, Palette, DollarSign, Shield, Download, 
  Trash2, Info, Moon, Sun, Monitor, Smartphone, Upload,
  Tag, Wallet, Fingerprint
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';
import CategoryManagement from '@/components/CategoryManagement';
import AccountManagement from '@/components/AccountManagement';

// Lazy load to avoid circular dependency
const DeleteDataDialog = lazy(() => import('@/components/DeleteDataDialog').then(mod => ({ default: mod.DeleteDataDialog })));

interface SettingsPageProps {
  onBack?: () => void;
}

type ThemeMode = 'light' | 'dark' | 'system';

interface ImportData {
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings?: UserSettings;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const { canInstall, isInstalled, install } = usePWA();
  const { isSupported: biometricsSupported, isEnabled: biometricsEnabled, enable: enableBiometrics, disable: disableBiometrics } = useBiometrics();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTogglingBiometrics, setIsTogglingBiometrics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('mfo-theme') as ThemeMode;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const handleCurrencyChange = async (currencyCode: string) => {
    if (!settings) return;
    await updateSettings({ ...settings, defaultCurrency: currencyCode });
    setSettings({ ...settings, defaultCurrency: currencyCode });
    toast.success(t('settings.saved'));
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('mfo-theme', mode);
    
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
    toast.success(t('settings.saved'));
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      toast.success(t('settings.installSuccess'));
    }
  };

  const handleBiometricsToggle = async (enabled: boolean) => {
    setIsTogglingBiometrics(true);
    try {
      if (enabled) {
        const success = await enableBiometrics();
        if (success) {
          toast.success(t('settings.biometricsEnabled'));
        } else {
          toast.error(t('biometrics.failed'));
        }
      } else {
        await disableBiometrics();
        toast.success(t('settings.biometricsDisabled'));
      }
    } finally {
      setIsTogglingBiometrics(false);
    }
  };

  const handleExportData = async () => {
    try {
      const db = await import('@/lib/db');
      const allTransactions = await db.getTransactions();
      const [categories, accounts, settings] = await Promise.all([
        db.getCategories(),
        db.getAccounts(),
        db.getSettings(),
      ]);
      
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions: allTransactions,
        categories,
        accounts,
        settings,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mfo-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(t('settings.exportSuccess'));
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ImportData;
        
        // Validate format
        if (!data.version || !data.transactions || !Array.isArray(data.transactions)) {
          toast.error(t('import.invalidFormat'));
          return;
        }
        
        setImportData(data);
        setShowImportDialog(true);
      } catch (error) {
        toast.error(t('import.invalidFormat'));
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportData = async () => {
    if (!importData) return;
    
    setIsImporting(true);
    try {
      const db = await getDB();
      
      // Import categories (avoiding duplicates by checking name + type)
      const existingCategories = await db.getAll('categories');
      const existingCatKeys = new Set(existingCategories.map(c => `${c.type}-${c.name}`));
      
      for (const cat of importData.categories) {
        const key = `${cat.type}-${cat.name}`;
        if (!existingCatKeys.has(key)) {
          await db.put('categories', cat);
        }
      }
      
      // Import accounts (avoiding duplicates by name)
      const existingAccounts = await db.getAll('accounts');
      const existingAccNames = new Set(existingAccounts.map(a => a.name));
      
      for (const acc of importData.accounts) {
        if (!existingAccNames.has(acc.name)) {
          await db.put('accounts', acc);
        }
      }
      
      // Import transactions (avoid exact duplicates by ID)
      const existingTransactions = await db.getAll('transactions');
      const existingTxIds = new Set(existingTransactions.map(t => t.id));
      
      for (const tx of importData.transactions) {
        if (!existingTxIds.has(tx.id)) {
          await db.put('transactions', tx);
        }
      }
      
      setShowImportDialog(false);
      setImportData(null);
      toast.success(t('import.success'));
      
      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(t('import.error'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-bold text-lg">{t('settings.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('settings.appearance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.theme')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('light')}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  {t('settings.light')}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('dark')}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t('settings.dark')}
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange('system')}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  {t('settings.system')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language & Currency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('settings.localization')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.language')}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('settings.defaultCurrency')}
              </Label>
              <Select 
                value={settings?.defaultCurrency || 'BRL'} 
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Categories & Accounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t('category.title')} & {t('account.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowCategoryManagement(true)}
            >
              <Tag className="h-4 w-4 mr-2" />
              {t('category.title')}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowAccountManagement(true)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {t('account.title')}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        {biometricsSupported && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                {t('settings.security')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.biometrics')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.biometricsDesc')}</p>
                </div>
                <Switch 
                  checked={biometricsEnabled} 
                  onCheckedChange={handleBiometricsToggle}
                  disabled={isTogglingBiometrics}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Install App */}
        {canInstall && !isInstalled && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{t('settings.installApp')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.installDesc')}</p>
                  </div>
                </div>
                <Button onClick={handleInstall}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('settings.install')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('settings.dataManagement')}
            </CardTitle>
            <CardDescription>{t('settings.dataPrivacy')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('settings.exportData')}
            </Button>
            
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button 
                variant="outline" 
                className="w-full justify-start pointer-events-none"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('settings.importData')}
              </Button>
            </div>
            
            <Button 
              variant="destructive" 
              className="w-full justify-start"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.deleteAllData')}
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('settings.about')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>MFO - My Finance Offline</strong></p>
            <p>{t('settings.version')} 1.0.0</p>
            <p>{t('settings.aboutDesc')}</p>
          </CardContent>
        </Card>
      </main>

      {/* Delete Data Dialog - Multi-step secure deletion */}
      <Suspense fallback={null}>
        <DeleteDataDialog 
          open={showDeleteDialog} 
          onOpenChange={setShowDeleteDialog}
        />
      </Suspense>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('import.confirmImport')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('import.confirmMessage')}</p>
              {importData && (
                <div className="bg-secondary/50 rounded-lg p-3 mt-3 space-y-1 text-sm">
                  <p>{t('import.transactionsCount', { count: importData.transactions.length })}</p>
                  <p>{t('import.categoriesCount', { count: importData.categories.length })}</p>
                  <p>{t('import.accountsCount', { count: importData.accounts.length })}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleImportData}
              disabled={isImporting}
            >
              {isImporting ? t('import.importing') : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Management */}
      <CategoryManagement
        open={showCategoryManagement}
        onClose={() => setShowCategoryManagement(false)}
      />

      {/* Account Management */}
      <AccountManagement
        open={showAccountManagement}
        onClose={() => setShowAccountManagement(false)}
        defaultCurrency={settings?.defaultCurrency}
      />
    </div>
  );
}
