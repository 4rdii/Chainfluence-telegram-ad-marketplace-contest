import { useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Bell,
  BellOff,
  Coins,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Megaphone,
  AlertTriangle,
  HandCoins,
  Undo2,
  Briefcase,
  ThumbsUp,
  ThumbsDown,
  Timer,
} from 'lucide-react';
import { Notification, NotificationType } from '../../types';

interface NotificationsScreenProps {
  notifications: Notification[];
  onBack: () => void;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

interface NotificationMeta {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function getNotificationMeta(type: NotificationType): NotificationMeta {
  switch (type) {
    case 'booking_request':
      return {
        icon: <Megaphone className="w-4 h-4" />,
        color: 'text-[var(--ton-blue)]',
        bgColor: 'bg-[var(--ton-blue)]/15',
      };
    case 'deposit_received':
      return {
        icon: <Coins className="w-4 h-4" />,
        color: 'text-[var(--success-green)]',
        bgColor: 'bg-[var(--success-green)]/15',
      };
    case 'deal_accepted':
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-[var(--success-green)]',
        bgColor: 'bg-[var(--success-green)]/15',
      };
    case 'deal_declined':
      return {
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-[var(--error-red)]',
        bgColor: 'bg-[var(--error-red)]/15',
      };
    case 'creative_submitted':
      return {
        icon: <FileText className="w-4 h-4" />,
        color: 'text-[var(--pending-amber)]',
        bgColor: 'bg-[var(--pending-amber)]/15',
      };
    case 'creative_approved':
      return {
        icon: <ThumbsUp className="w-4 h-4" />,
        color: 'text-[var(--success-green)]',
        bgColor: 'bg-[var(--success-green)]/15',
      };
    case 'creative_changes_requested':
      return {
        icon: <Undo2 className="w-4 h-4" />,
        color: 'text-[var(--pending-amber)]',
        bgColor: 'bg-[var(--pending-amber)]/15',
      };
    case 'posting_reminder':
      return {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-[var(--pending-amber)]',
        bgColor: 'bg-[var(--pending-amber)]/15',
      };
    case 'post_verified':
      return {
        icon: <CheckCheck className="w-4 h-4" />,
        color: 'text-[var(--ton-blue)]',
        bgColor: 'bg-[var(--ton-blue)]/15',
      };
    case 'funds_released':
      return {
        icon: <HandCoins className="w-4 h-4" />,
        color: 'text-[var(--success-green)]',
        bgColor: 'bg-[var(--success-green)]/15',
      };
    case 'funds_refunded':
      return {
        icon: <Undo2 className="w-4 h-4" />,
        color: 'text-[var(--error-red)]',
        bgColor: 'bg-[var(--error-red)]/15',
      };
    case 'dispute_opened':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-[var(--error-red)]',
        bgColor: 'bg-[var(--error-red)]/15',
      };
    case 'campaign_offer':
      return {
        icon: <Briefcase className="w-4 h-4" />,
        color: 'text-[var(--ton-blue)]',
        bgColor: 'bg-[var(--ton-blue)]/15',
      };
    case 'offer_accepted':
      return {
        icon: <ThumbsUp className="w-4 h-4" />,
        color: 'text-[var(--success-green)]',
        bgColor: 'bg-[var(--success-green)]/15',
      };
    case 'offer_declined':
      return {
        icon: <ThumbsDown className="w-4 h-4" />,
        color: 'text-[var(--error-red)]',
        bgColor: 'bg-[var(--error-red)]/15',
      };
    case 'campaign_ending':
      return {
        icon: <Timer className="w-4 h-4" />,
        color: 'text-[var(--pending-amber)]',
        bgColor: 'bg-[var(--pending-amber)]/15',
      };
    default:
      return {
        icon: <Bell className="w-4 h-4" />,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
  }
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay.getTime() >= today.getTime()) return 'Today';
  if (dateDay.getTime() >= yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
}

type Filter = 'all' | 'unread';

export function NotificationsScreen({
  notifications,
  onBack,
  onNotificationClick,
  onMarkAllRead,
  onMarkRead,
}: NotificationsScreenProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Group notifications by date
  const groups: { label: string; items: typeof sorted }[] = [];
  const seen = new Map<string, typeof sorted>();

  for (const notif of sorted) {
    const group = getDateGroup(notif.timestamp);
    if (!seen.has(group)) {
      const items: typeof sorted = [];
      seen.set(group, items);
      groups.push({ label: group, items });
    }
    seen.get(group)!.push(notif);
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 -ml-1 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-[var(--error-red)] text-white text-xs font-medium rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        </div>
      </div>

      {/* Notification list */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <BellOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'unread'
              ? "You've read all your notifications"
              : "You'll be notified about deal updates, offers, and more"}
          </p>
        </div>
      ) : (
        <div className="pt-2">
          {groups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Date group header */}
              <div className={`px-5 pb-3 ${groupIdx === 0 ? 'pt-5' : 'pt-7'}`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {group.label}
                </p>
              </div>

              {/* Notifications in group */}
              <div className="px-4 space-y-3">
                {group.items.map((notification) => {
                  const meta = getNotificationMeta(notification.type);

                  return (
                    <button
                      key={notification.id}
                      onClick={() => {
                        if (!notification.read) onMarkRead(notification.id);
                        onNotificationClick(notification);
                      }}
                      className={`w-full flex items-start gap-3.5 p-4 rounded-xl transition-all text-left ${
                        notification.read
                          ? 'bg-card/50 hover:bg-card/80'
                          : 'bg-card border border-border hover:border-primary/30'
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bgColor} ${meta.color}`}
                      >
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              notification.read
                                ? 'text-muted-foreground'
                                : 'font-medium text-foreground'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {notification.body}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
