import { Megaphone, Rocket, Handshake, User, type LucideIcon } from 'lucide-react';
import { hapticSelection } from '../lib/telegram';

export type TabType = 'home' | 'channels' | 'campaigns' | 'deals' | 'profile';

interface TabDef {
  id: TabType;
  icon?: LucideIcon;
  logo?: boolean;
  label: string;
}

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  notificationCount?: number;
}

export function BottomNav({ activeTab, onTabChange, notificationCount = 0 }: BottomNavProps) {
  const tabs: TabDef[] = [
    { id: 'home', logo: true, label: 'Home' },
    { id: 'channels', icon: Megaphone, label: 'Channels' },
    { id: 'campaigns', icon: Rocket, label: 'Campaigns' },
    { id: 'deals', icon: Handshake, label: 'Deals' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleTabClick = (tabId: TabType) => {
    hapticSelection();
    onTabChange(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.logo ? (
                <img src="/logo.svg" alt="Chainfluence" className="w-6 h-6 mb-0.5" />
              ) : Icon ? (
                <Icon className="w-5 h-5 mb-1" />
              ) : null}
              <span className="text-xs">{tab.label}</span>
              {tab.id === 'home' && notificationCount > 0 && (
                <span className="absolute top-2 right-1/4 bg-[var(--error-red)] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
