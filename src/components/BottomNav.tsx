import React from 'react';
import { useI18n } from '@/lib/i18n';
import { Home, BarChart3, Settings } from 'lucide-react';

type Tab = 'dashboard' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useI18n();

  const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: 'dashboard', icon: Home, label: t('nav.dashboard') },
    { id: 'reports', icon: BarChart3, label: t('nav.reports') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors touch-feedback ${
              activeTab === id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={`h-5 w-5 mb-1 ${activeTab === id ? 'scale-110' : ''} transition-transform`} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
