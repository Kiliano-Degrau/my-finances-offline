import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { getSettings, updateSettings, deleteAllData, UserSettings } from '@/lib/db';
import { currencies } from '@/lib/currencies';
import { usePWA } from '@/hooks/usePWA';
import { 
  ChevronLeft, Globe, Palette, DollarSign, Shield, Download, 
  Trash2, Info, ExternalLink, Moon, Sun, Monitor, Smartphone 
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

interface SettingsPageProps {
  onBack?: () => void;
}

type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const { canInstall, isInstalled, install } = usePWA();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDeleteAllData = async () => {
    await deleteAllData();
    setShowDeleteDialog(false);
    toast.success(t('settings.dataDeleted'));
    window.location.reload();
  };

  const handleExportData = async () => {
    try {
      const db = await import('@/lib/db');
      const [transactions, categories, accounts, settings] = await Promise.all([
        db.getTransactionsByMonth(new Date().getFullYear(), new Date().getMonth()),
        db.getCategories(),
        db.getAccounts(),
        db.getSettings(),
      ]);
      
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions,
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
      toast.error(t('common.error'));
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteAllData')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
