import { Home, Megaphone, Rocket, Handshake, User } from 'lucide-react';

export type TabType = 'home' | 'channels' | 'campaigns' | 'deals' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  notificationCount?: number;
}

export function BottomNav({ activeTab, onTabChange, notificationCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'home' as TabType, icon: Home, label: 'Home' },
    { id: 'channels' as TabType, icon: Megaphone, label: 'Channels' },
    { id: 'campaigns' as TabType, icon: Rocket, label: 'Campaigns' },
    { id: 'deals' as TabType, icon: Handshake, label: 'Deals' },
    { id: 'profile' as TabType, icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
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
