'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { Code2, Plus, Users, LogOut, BarChart2, Settings, Globe, Lock, Copy, ArrowRight, Share2, LayoutDashboard, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar } from '@/components/ui/Avatar';

export default function DashboardPage() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createForm, setCreateForm] = useState({ room_name: '', description: '', is_public: false });
  const [inviteCode, setInviteCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyInviteCode = (e: React.MouseEvent, code: string, roomId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/api/rooms').then(r => r.data.data),
  });

  const createRoom = useMutation({
    mutationFn: (data: typeof createForm) => api.post('/api/rooms', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); setShowCreateModal(false); setCreateForm({ room_name: '', description: '', is_public: false }); },
  });

  const joinRoom = useMutation({
    mutationFn: (code: string) => api.post(`/api/rooms/join/${code}`, {}),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['rooms'] }); setShowJoinModal(false); setInviteCode(''); router.push(`/room/${res.data.data.room_id || res.data.data.id}`); },
  });

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Analytics', icon: BarChart2, href: '/analytics' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-60 bg-card border-r border-border flex flex-col z-40">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-2.5 flex-shrink-0">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">CodeSync AI</p>
              <p className="text-[11px] text-muted-foreground">Collaborative Editor</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-secondary/50 border border-border/50">
            <Avatar seed={user?.username ?? 'user'} size={36} avatarStyle={(user?.avatar_style as any) ?? 'avataaars'} className="ring-2 ring-primary/20" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Navigation</p>
          {navItems.map(({ label, icon: Icon, href }) => (
            <button key={href} onClick={() => router.push(href)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
              {pathname === href && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
            </button>
          ))}

          <div className="pt-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Account</p>
            <NotificationBell placement="left" showLabel />
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-border">
          <button onClick={() => { clearAuth(); router.push('/'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="pl-60 min-h-screen">
        <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.username}</h1>
            <p className="text-muted-foreground">Your collaborative workspaces</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowJoinModal(true)}
              className="border border-border px-4 py-2 rounded-lg text-sm hover:bg-secondary flex items-center gap-2">
              <Copy className="h-4 w-4" /> Join Room
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Room
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(roomsData || []).map((room: any) => (
            <div key={room.id} onClick={() => router.push(`/room/${room.id}`)}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-primary/10 rounded-lg p-2">
                  <Code2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1.5">
                  {room.is_public ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize">{room.role}</span>
                </div>
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{room.room_name}</h3>
              {room.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><Users className="h-3 w-3" /> Room</div>
                <div className="flex items-center gap-2">
                  {room.invite_code && (
                    <button
                      onClick={(e) => copyInviteCode(e, room.invite_code, room.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary hover:bg-border transition-colors"
                      title="Copy invite code">
                      {copiedId === room.id ? <span className="text-green-400">Copied!</span> : <><Share2 className="h-3 w-3" /><span className="font-mono">{room.invite_code}</span></>}
                    </button>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {(!roomsData || roomsData.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-secondary rounded-full p-6 mb-4"><Code2 className="h-10 w-10 text-muted-foreground" /></div>
              <h3 className="font-semibold text-lg mb-2">No rooms yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">Create your first room to start collaborating with your team in real-time.</p>
              <button onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Room
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create New Room</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Room Name *</label>
                <input value={createForm.room_name} onChange={e => setCreateForm(f => ({ ...f, room_name: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="My Awesome Project" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Optional description" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={createForm.is_public} onChange={e => setCreateForm(f => ({ ...f, is_public: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm">Public room (anyone can join)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
                <button onClick={() => createRoom.mutate(createForm)} disabled={!createForm.room_name || createRoom.isPending}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm hover:bg-primary/90 disabled:opacity-50">
                  {createRoom.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowJoinModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Join Room</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Invite Code</label>
                <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono tracking-widest text-center"
                  placeholder="XXXXXXXX" maxLength={8} />
              </div>
              {joinRoom.isError && (
                <p className="text-sm text-destructive">
                  {(joinRoom.error as any)?.response?.data?.message || 'Invalid invite code. Please try again.'}
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowJoinModal(false); joinRoom.reset(); }} className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-secondary">Cancel</button>
                <button onClick={() => joinRoom.mutate(inviteCode)} disabled={inviteCode.length < 6 || joinRoom.isPending}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm hover:bg-primary/90 disabled:opacity-50">
                  {joinRoom.isPending ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
