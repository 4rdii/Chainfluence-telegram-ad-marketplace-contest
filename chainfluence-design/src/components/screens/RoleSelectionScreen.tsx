import { useState } from 'react';
import { Megaphone, Rocket, Check } from 'lucide-react';
import { User, UserRole } from '../../types';

interface RoleSelectionScreenProps {
  user: User;
  onComplete: (roles: UserRole[]) => void;
}

export function RoleSelectionScreen({ user, onComplete }: RoleSelectionScreenProps) {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);

  const toggleRole = (role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const roles = [
    {
      id: 'publisher' as UserRole,
      icon: Megaphone,
      title: "I'm a Publisher",
      subtitle: 'List your channel and earn TON',
      description:
        'Monetize your Telegram channel by accepting ad deals from advertisers. Set your own prices and approve content.',
      color: 'var(--ton-blue)',
    },
    {
      id: 'advertiser' as UserRole,
      icon: Rocket,
      title: "I'm an Advertiser",
      subtitle: 'Promote your product to targeted audiences',
      description:
        'Book ad slots on channels or create campaigns and let publishers come to you. Pay with TON escrow.',
      color: 'var(--success-green)',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12 text-center">
        <img
          src={user.avatar}
          alt={user.displayName}
          className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-border"
        />
        <h1 className="text-2xl font-bold mb-1">
          Welcome, {user.displayName}!
        </h1>
        <p className="text-muted-foreground">
          How would you like to use Chainfluence?
        </p>
      </div>

      {/* Role cards */}
      <div className="flex-1 px-5 space-y-5 mt-4">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRoles.includes(role.id);

          return (
            <button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              <div className="flex items-start gap-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${role.color}20`, color: role.color }}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{role.title}</h3>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-primary/80 mb-3">{role.subtitle}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="p-6 pb-10">
        <p className="text-xs text-muted-foreground text-center mb-5">
          You can be both. Switch roles anytime from your profile.
        </p>
        <button
          onClick={() => onComplete(selectedRoles)}
          disabled={selectedRoles.length === 0}
          className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
