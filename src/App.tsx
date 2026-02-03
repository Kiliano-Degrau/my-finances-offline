import React, { useEffect, useState } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { initializeDB } from '@/lib/db';
import Dashboard from '@/pages/Dashboard';
import Reports from '@/pages/Reports';
import SettingsPage from '@/pages/SettingsPage';
import BottomNav from '@/components/BottomNav';
import { Toaster } from '@/components/ui/sonner';

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
  const { t } = useI18n();

  useEffect(() => {
    initializeDB().then(() => setReady(true));
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
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'settings' && <SettingsPage />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
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
