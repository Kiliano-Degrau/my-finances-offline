import React, { useEffect, useState } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { initializeDB } from '@/lib/db';
import Dashboard from '@/pages/Dashboard';
import Reports from '@/pages/Reports';
import SettingsPage from '@/pages/SettingsPage';
import BottomNav from '@/components/BottomNav';
import { Toaster } from '@/components/ui/sonner';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { useServiceWorker } from '@/hooks/useServiceWorker';
type Tab = 'dashboard' | 'reports' | 'settings';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('mfo-theme');
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    
    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else if (savedTheme === 'light') {
      // Keep light mode
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, []);
  return <>{children}</>;
}

function AppContent() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [initialAction, setInitialAction] = useState<'income' | 'expense' | null>(null);
  const { t } = useI18n();
  const { updateAvailable, applyUpdate } = useServiceWorker();

  useEffect(() => {
    initializeDB().then(() => setReady(true));
    
    // Handle PWA shortcuts
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'income' || action === 'expense') {
      setInitialAction(action);
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-2">🐷</div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {activeTab === 'dashboard' && <Dashboard initialAction={initialAction} onActionHandled={() => setInitialAction(null)} />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'settings' && <SettingsPage />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <UpdatePrompt open={updateAvailable} onUpdate={applyUpdate} />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppContent />
        <Toaster />
      </ThemeProvider>
    </I18nProvider>
  );
}
