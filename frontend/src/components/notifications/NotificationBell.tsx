'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Zap, Users, Bot, Info, X, ArrowRight, CheckCircle2, XCircle, Code2 } from 'lucide-react';
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

function typeIcon(type: string) {
  if (type === 'execution') return <Zap className="h-3.5 w-3.5 text-yellow-400" />;
  if (type === 'invite')    return <Users className="h-3.5 w-3.5 text-blue-400" />;
  if (type === 'system')    return <Info className="h-3.5 w-3.5 text-purple-400" />;
  return <Bot className="h-3.5 w-3.5 text-primary" />;
}

function typeBg(type: string) {
  if (type === 'execution') return 'bg-yellow-400/10';
  if (type === 'invite')    return 'bg-blue-400/10';
  if (type === 'system')    return 'bg-purple-400/10';
  return 'bg-primary/10';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface NotificationBellProps {
  /** 'left' = dropdown opens rightward (for left sidebar). 'right' = opens leftward (default, for top-right header). */
  placement?: 'left' | 'right';
  /** Show label text next to the bell (for expanded sidebar). */
  showLabel?: boolean;
}

export function NotificationBell({ placement = 'right', showLabel = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications').then(r => r.data.data),
    refetchInterval: 20000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter(n => !n.read);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const goToAll = () => { setOpen(false); router.push('/notifications'); };

  const dropdownPos = placement === 'left'
    ? 'left-full top-0 ml-3'
    : 'right-0 top-full mt-2';

  return (
    <div ref={ref} className={`relative ${showLabel ? 'w-full' : 'inline-flex'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-3 rounded-lg transition-colors ${
          showLabel ? 'w-full px-3 py-2.5' : 'p-1.5'
        } ${open ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
        title="Notifications">
        <div className="relative flex-shrink-0">
          <Bell className="h-[18px] w-[18px]" />
          {unread.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </div>
        {showLabel && (
          <span className="text-sm font-medium flex-1 text-left">Notifications</span>
        )}
        {showLabel && unread.length > 0 && (
          <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-medium">{unread.length}</span>
        )}
      </button>

      {open && (
        <div className={`absolute ${dropdownPos} w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {unread.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{unread.length} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button onClick={() => unread.forEach(n => markRead.mutate(n.id))}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors">
                  <CheckCheck className="h-3 w-3" />
                  Read all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs opacity-60 mt-1">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div key={n.id} onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/50 ${!n.read ? 'bg-primary/5' : ''}`}>
                  {/* Type icon */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${typeBg(n.type)}`}>
                    {typeIcon(n.type)}
                  </div>
                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold leading-snug">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    {/* Execution extra details */}
                    {n.type === 'execution' && n.data?.language && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">
                          <Code2 className="h-2.5 w-2.5" />{n.data.language}
                        </span>
                        {n.data.executionTimeMs && (
                          <span className="text-[10px] text-muted-foreground">{n.data.executionTimeMs}ms</span>
                        )}
                        {n.data.exitCode === 0
                          ? <CheckCircle2 className="h-3 w-3 text-green-400" />
                          : n.data.exitCode !== undefined
                          ? <XCircle className="h-3 w-3 text-red-400" />
                          : null}
                      </div>
                    )}
                  </div>
                  {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 bg-secondary/20">
            <button onClick={goToAll}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors group">
              <span>View all notifications ({notifications.length})</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
