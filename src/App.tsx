import React, { useEffect, useState } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { initializeDB } from '@/lib/db';
import Dashboard from '@/pages/Dashboard';
import { Toaster } from '@/components/ui/sonner';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);
  return <>{children}</>;
}

function AppContent() {
  const [ready, setReady] = useState(false);
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

  return <Dashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
