'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Bell, ArrowLeft, CheckCheck, Zap, Users, Bot, Info,
  Trash2, Clock, Code2, Timer, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data: Record<string, any>;
}

type FilterTab = 'all' | 'unread' | 'execution' | 'invite' | 'system';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'unread',    label: 'Unread' },
  { key: 'execution', label: 'Execution' },
  { key: 'invite',    label: 'Invite' },
  { key: 'system',    label: 'System' },
];

function typeIcon(type: string, size = 'h-4 w-4') {
  if (type === 'execution') return <Zap className={`${size} text-yellow-400`} />;
  if (type === 'invite')    return <Users className={`${size} text-blue-400`} />;
  if (type === 'system')    return <Info className={`${size} text-purple-400`} />;
  return <Bot className={`${size} text-primary`} />;
}

function typeBg(type: string) {
  if (type === 'execution') return 'bg-yellow-400/10';
  if (type === 'invite')    return 'bg-blue-400/10';
  if (type === 'system')    return 'bg-purple-400/10';
  return 'bg-primary/10';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function timeStr(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ExecutionDetails({ data }: { data: Record<string, any> }) {
  if (!data?.language) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1 text-[11px] bg-secondary px-2 py-0.5 rounded-full">
        <Code2 className="h-3 w-3 text-muted-foreground" /> {data.language}
      </span>
      {data.executionTimeMs !== undefined && (
        <span className="inline-flex items-center gap-1 text-[11px] bg-secondary px-2 py-0.5 rounded-full">
          <Timer className="h-3 w-3 text-muted-foreground" /> {data.executionTimeMs}ms
        </span>
      )}
      {data.exitCode !== undefined && (
        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${data.exitCode === 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
          {data.exitCode === 0
            ? <CheckCircle2 className="h-3 w-3" />
            : <XCircle className="h-3 w-3" />}
          Exit {data.exitCode}
        </span>
      )}
    </div>
  );
}

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const label = formatDate(n.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('all');

  const { data: all = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications').then(r => r.data.data),
    refetchInterval: 20000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = () =>
    all.filter(n => !n.read).forEach(n => markRead.mutate(n.id));

  const filtered = all.filter(n => {
    if (tab === 'all')       return true;
    if (tab === 'unread')    return !n.read;
    if (tab === 'execution') return n.type === 'execution';
    if (tab === 'invite')    return n.type === 'invite';
    if (tab === 'system')    return n.type === 'system';
    return true;
  });

  const countFor = (t: FilterTab) => {
    if (t === 'all')       return all.length;
    if (t === 'unread')    return all.filter(n => !n.read).length;
    if (t === 'execution') return all.filter(n => n.type === 'execution').length;
    if (t === 'invite')    return all.filter(n => n.type === 'invite').length;
    if (t === 'system')    return all.filter(n => n.type === 'system').length;
    return 0;
  };

  const groups = groupByDate(filtered);
  const unreadCount = all.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-normal">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">Execution results, room invites, and system alerts</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
              {countFor(t.key) > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-primary/20 text-primary' : 'bg-border text-muted-foreground'
                }`}>
                  {countFor(t.key)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 opacity-30" />
            </div>
            <p className="font-medium">No {tab === 'all' ? '' : tab} notifications</p>
            <p className="text-sm mt-1 opacity-60">
              {tab === 'unread' ? "You're all caught up!" : "Nothing here yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                {/* Date group header */}
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{dateLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{items.length} notification{items.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Notification cards */}
                <div className="space-y-2">
                  {items.map(n => (
                    <div key={n.id}
                      className={`relative bg-card border rounded-xl p-4 transition-all ${
                        !n.read ? 'border-primary/30 shadow-sm shadow-primary/5' : 'border-border'
                      }`}>
                      {/* Unread indicator bar */}
                      {!n.read && (
                        <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-primary rounded-full" />
                      )}

                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeBg(n.type)}`}>
                          {typeIcon(n.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-semibold ${!n.read ? 'text-foreground' : 'text-foreground/80'}`}>
                                {n.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                              {n.type === 'execution' && <ExecutionDetails data={n.data} />}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeStr(n.created_at)}</span>
                              {!n.read && (
                                <button onClick={() => markRead.mutate(n.id)}
                                  className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                                  title="Mark as read">
                                  <CheckCheck className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats footer */}
        {all.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{all.length} total notifications</span>
            <span>{all.filter(n => n.read).length} read · {unreadCount} unread</span>
          </div>
        )}
      </div>
    </div>
  );
}
