import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useI18n } from '@/lib/i18n';
import { getSettings, updateSettings, UserSettings, getDB, Transaction, Category, Account } from '@/lib/db';
import { currencies } from '@/lib/currencies';
import { usePWA } from '@/hooks/usePWA';
import { useBiometrics } from '@/hooks/useBiometrics';
import {
  ChevronLeft, Globe, Palette, DollarSign, Shield, Download,
  Trash2, Info, Moon, Sun, Monitor, Smartphone, Upload,
  Tag, Wallet, Fingerprint, Key, Bot, Eye, EyeOff, Save,
  ExternalLink, Check, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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

/**
 * =================================================================
 * CHAVES DE SERVIÇOS EXTERNOS — Armazenamento no IndexedDB
 * =================================================================
 * 
 * Salvo na store "settings" com id: "externalKeys".
 * 
 * Estrutura:
 * {
 *   id: "externalKeys",
 *   geminiApiKey: string,
 *   geminiEnabled: boolean,
 *   updatedAt: number
 * }
 * 
 * Para RESGATAR em qualquer parte do app:
 * 
 *   import { getDB } from '@/lib/db';
 * 
 *   async function getExternalKeys() {
 *     const db = await getDB();
 *     const keys = await db.get('settings', 'externalKeys');
 *     return keys || { geminiApiKey: '', geminiEnabled: false };
 *   }
 * 
 * =================================================================
 */

interface ExternalKeysData {
  id: string;
  geminiApiKey: string;
  geminiEnabled: boolean;
  updatedAt: number;
}

const EXTERNAL_KEYS_ID = 'externalKeys';

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const { canInstall, isInstalled, install } = usePWA();
  const { isSupported: biometricsSupported, isEnabled: biometricsEnabled, enable: enableBiometrics, disable: disableBiometrics, unlock: biometricsUnlock } = useBiometrics();
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

  // External Keys state
  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  const geminiKeyHasChanges = geminiApiKey !== savedGeminiApiKey;

  useEffect(() => {
    loadSettings();
    loadExternalKeys();
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

  const loadExternalKeys = async () => {
    try {
      const db = await getDB();
      const data = await db.get('settings', EXTERNAL_KEYS_ID) as ExternalKeysData | undefined;
      if (data) {
        setGeminiEnabled(data.geminiEnabled);
        setGeminiApiKey(data.geminiApiKey);
        setSavedGeminiApiKey(data.geminiApiKey);
      }
    } catch (e) {
      console.warn('Erro ao carregar chaves externas:', e);
    }
  };

  const saveExternalKeys = async (data: Partial<ExternalKeysData>) => {
    const db = await getDB();
    let current: ExternalKeysData;
    try {
      current = (await db.get('settings', EXTERNAL_KEYS_ID) as ExternalKeysData) || {
        id: EXTERNAL_KEYS_ID, geminiApiKey: '', geminiEnabled: false, updatedAt: 0
      };
    } catch {
      current = { id: EXTERNAL_KEYS_ID, geminiApiKey: '', geminiEnabled: false, updatedAt: 0 };
    }
    await db.put('settings', { ...current, ...data, id: EXTERNAL_KEYS_ID, updatedAt: Date.now() });
  };

  const handleGeminiToggle = async (enabled: boolean) => {
    setGeminiEnabled(enabled);
    await saveExternalKeys({ geminiEnabled: enabled });
    toast.success(t('settings.saved'));
  };

  const handleSaveGeminiKey = async () => {
    // Se o campo estiver vazio, salvar sem testar (remoção da chave)
    if (!geminiApiKey.trim()) {
      await saveExternalKeys({ geminiApiKey: '', geminiEnabled });
      setSavedGeminiApiKey('');
      toast.success(t('externalKeys.aiImport.keyRemoved'));
      return;
    }

    // Testar a chave antes de salvar
    setIsTestingGemini(true);
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey.trim(),
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        toast.error(t('externalKeys.aiImport.keyInvalid'));
        return;
      }

      if (data.candidates?.[0]?.content?.parts) {
        await saveExternalKeys({ geminiApiKey: geminiApiKey.trim(), geminiEnabled });
        setSavedGeminiApiKey(geminiApiKey.trim());
        toast.success(t('externalKeys.aiImport.keyValid'));
      } else {
        toast.error(t('externalKeys.aiImport.keyInvalid'));
      }
    } catch (e: any) {
      toast.error(t('externalKeys.aiImport.keyInvalid'));
    } finally {
      setIsTestingGemini(false);
    }
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

        {/* External Service Keys */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('externalKeys.title')}
            </CardTitle>
            <CardDescription>{t('externalKeys.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-primary" />
                <Label className="font-medium">{t('externalKeys.aiImport.title')}</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('externalKeys.aiImport.description')}
              </p>

              {/* Toggle ativo/desativado */}
              <div className="flex items-center justify-between">
                <Label>{geminiEnabled ? t('externalKeys.enabled') : t('externalKeys.disabled')}</Label>
                <Switch checked={geminiEnabled} onCheckedChange={handleGeminiToggle} />
              </div>

              {/* Conteúdo visível quando ativado */}
              {geminiEnabled && (
                <div className="space-y-3 pt-2">
                  {/* Input da API Key */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('externalKeys.aiImport.apiKeyLabel')}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showGeminiKey ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="pr-10"
                          disabled={isTestingGemini}
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        disabled={!geminiKeyHasChanges || isTestingGemini}
                        onClick={handleSaveGeminiKey}
                        className="flex items-center gap-1.5 min-w-[90px]"
                      >
                        {isTestingGemini ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : geminiKeyHasChanges ? (
                          <>
                            <Save className="h-4 w-4" />
                            {t('common.save')}
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            {t('externalKeys.aiImport.saved')}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Loading text durante o teste */}
                    {isTestingGemini && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('externalKeys.aiImport.testing')}
                      </p>
                    )}
                  </div>

                  {/* Mini tutorial */}
                  <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{t('externalKeys.aiImport.howToGetKey')}</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        {t('externalKeys.aiImport.step1')}{' '}
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-0.5"
                        >
                          Google AI Studio <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>{t('externalKeys.aiImport.step2')}</li>
                      <li>{t('externalKeys.aiImport.step3')}</li>
                      <li>{t('externalKeys.aiImport.step4')}</li>
                    </ol>
                    <p className="text-xs opacity-75">{t('externalKeys.aiImport.freeInfo')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
          biometricsEnabled={biometricsEnabled}
          onBiometricUnlock={biometricsUnlock}
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