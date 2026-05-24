'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Key, Code2, Trash2, CheckCircle2,
  Eye, EyeOff, Save, Shield, Palette, AlertTriangle,
  ChevronRight, LogOut, Camera,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Avatar, AVATAR_STYLES, AvatarStyle, avatarUrl } from '@/components/ui/Avatar';

type Tab = 'profile' | 'security' | 'editor' | 'account';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'profile',  label: 'Profile',    icon: User },
  { key: 'security', label: 'Security',   icon: Shield },
  { key: 'editor',   label: 'Editor',     icon: Code2 },
  { key: 'account',  label: 'Account',    icon: Palette },
];

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 border ${
      type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {message}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-secondary/20">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUser, clearAuth } = useAuthStore();

  const [tab, setTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile
  const [username, setUsername]           = useState(user?.username ?? '');
  const [avatarStyle, setAvatarStyle]     = useState<AvatarStyle>((user?.avatar_style as AvatarStyle) ?? 'avataaars');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [savingPw, setSavingPw]     = useState(false);

  // Editor prefs (local only — no backend)
  const [fontSize, setFontSize]     = useState(14);
  const [tabSize, setTabSize]       = useState(2);
  const [wordWrap, setWordWrap]     = useState(true);
  const [minimap, setMinimap]       = useState(true);
  const [lineNums, setLineNums]     = useState(true);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveProfile() {
    if (!username.trim()) return;
    setSavingProfile(true);
    try {
      await api.put('/api/users/profile', { username: username.trim() });
      updateUser({ username: username.trim(), avatar_style: avatarStyle });
      showToast('Profile saved successfully');
    } catch {
      // API may not exist yet — still persist locally
      updateUser({ username: username.trim(), avatar_style: avatarStyle });
      showToast('Profile saved locally');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (!currentPw || !newPw || newPw !== confirmPw) return;
    if (newPw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    setSavingPw(true);
    try {
      await api.put('/api/users/password', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password changed successfully');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
    }
  }

  function saveEditorPrefs() {
    localStorage.setItem('editor_prefs', JSON.stringify({ fontSize, tabSize, wordWrap, minimap, lineNums }));
    showToast('Editor preferences saved');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
          {/* Current user mini card */}
          <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-xl">
            <Avatar seed={user?.username ?? 'user'} size={32} avatarStyle={avatarStyle} />
            <div>
              <p className="text-sm font-semibold leading-tight">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                  {tab === key && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <>
                <SectionCard title="Avatar" icon={Camera}>
                  <div className="flex items-start gap-6">
                    {/* Large preview */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <Avatar seed={user?.username ?? 'user'} size={96} avatarStyle={avatarStyle}
                        className="ring-4 ring-primary/20 shadow-lg" />
                      <span className="text-xs text-muted-foreground">{AVATAR_STYLES.find(s => s.value === avatarStyle)?.label}</span>
                    </div>

                    {/* Style picker */}
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-3">Choose avatar style</p>
                      <div className="grid grid-cols-3 gap-2">
                        {AVATAR_STYLES.map(s => (
                          <button key={s.value} onClick={() => setAvatarStyle(s.value)}
                            className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                              avatarStyle === s.value
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border hover:border-border/80 hover:bg-secondary/50'
                            }`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatarUrl(user?.username ?? 'user', s.value)}
                              alt={s.label}
                              style={{ width: 44, height: 44, display: 'block' }}
                            />
                            <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                            {avatarStyle === s.value && (
                              <div className="absolute top-1.5 right-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        Avatar is generated from your username — unique to you.
                      </p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Profile Information" icon={User}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Username</label>
                      <input value={username} onChange={e => setUsername(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        placeholder="your_username" />
                      <p className="text-xs text-muted-foreground mt-1">This is your display name across all rooms.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email</label>
                      <input value={user?.email ?? ''} disabled
                        className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">User ID</label>
                      <input value={user?.id ?? ''} disabled
                        className="w-full bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-xs font-mono text-muted-foreground cursor-not-allowed" />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button onClick={saveProfile} disabled={savingProfile || !username.trim()}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        <Save className="h-4 w-4" />
                        {savingProfile ? 'Saving…' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── SECURITY ── */}
            {tab === 'security' && (
              <SectionCard title="Change Password" icon={Key}>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Current Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">New Password</label>
                    <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    {newPw && newPw.length < 8 && (
                      <p className="text-xs text-red-400 mt-1">Must be at least 8 characters</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
                    <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    {confirmPw && newPw !== confirmPw && (
                      <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                    )}
                  </div>

                  {/* Password strength */}
                  {newPw && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                            (newPw.length >= i * 3) ? (newPw.length >= 12 ? 'bg-green-400' : newPw.length >= 8 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-secondary'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {newPw.length < 8 ? 'Too short' : newPw.length < 12 ? 'Acceptable' : 'Strong'}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button onClick={changePassword}
                      disabled={savingPw || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      <Key className="h-4 w-4" />
                      {savingPw ? 'Changing…' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── EDITOR ── */}
            {tab === 'editor' && (
              <SectionCard title="Editor Preferences" icon={Code2}>
                <div className="space-y-5 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Font Size</label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFontSize(f => Math.max(10, f - 1))}
                          className="h-9 w-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-lg font-bold transition-colors">−</button>
                        <span className="w-10 text-center text-sm font-mono font-semibold">{fontSize}</span>
                        <button onClick={() => setFontSize(f => Math.min(32, f + 1))}
                          className="h-9 w-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-lg font-bold transition-colors">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Tab Size</label>
                      <div className="flex gap-1">
                        {[2, 4, 8].map(n => (
                          <button key={n} onClick={() => setTabSize(n)}
                            className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
                              tabSize === n ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary hover:bg-secondary/80 text-muted-foreground'
                            }`}>{n}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Word Wrap', desc: 'Wrap long lines instead of scrolling', value: wordWrap, set: setWordWrap },
                      { label: 'Minimap',   desc: 'Show code minimap on the right',       value: minimap,  set: setMinimap  },
                      { label: 'Line Numbers', desc: 'Show line numbers in the editor',   value: lineNums, set: setLineNums },
                    ].map(({ label, desc, value, set }) => (
                      <label key={label} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <button onClick={() => set((v: boolean) => !v)}
                          className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-primary' : 'bg-border'}`}>
                          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </label>
                    ))}
                  </div>

                  {/* Editor preview */}
                  <div className="bg-secondary rounded-xl p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Preview</p>
                    <div className="font-mono" style={{ fontSize }}>
                      <span className="text-purple-400">function </span>
                      <span className="text-blue-400">greet</span>
                      <span className="text-foreground">(name) {'{'}</span><br />
                      <span style={{ paddingLeft: tabSize * 7 }} className="text-foreground inline-block">
                        <span className="text-purple-400">return </span>
                        <span className="text-green-400">`Hello, ${'{'}name{'}'}`</span>
                        <span className="text-foreground">;</span>
                      </span><br />
                      <span className="text-foreground">{'}'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={saveEditorPrefs}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── ACCOUNT ── */}
            {tab === 'account' && (
              <div className="space-y-5">
                {/* Account info */}
                <SectionCard title="Account Information" icon={User}>
                  <div className="space-y-3">
                    {[
                      { label: 'User ID',     value: user?.id },
                      { label: 'Username',    value: user?.username },
                      { label: 'Email',       value: user?.email },
                      { label: 'Avatar Style', value: AVATAR_STYLES.find(s => s.value === avatarStyle)?.label ?? 'Cartoon' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium truncate max-w-[60%] text-right font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Sign out */}
                <SectionCard title="Session" icon={LogOut}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Sign out of your account</p>
                      <p className="text-xs text-muted-foreground mt-0.5">You will be redirected to the login page.</p>
                    </div>
                    <button onClick={() => { clearAuth(); router.push('/'); }}
                      className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm hover:bg-secondary transition-colors">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </SectionCard>

                {/* Danger zone */}
                <div className="bg-card border border-red-500/30 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-red-500/20 bg-red-500/5">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                    <h2 className="font-semibold text-red-400">Danger Zone</h2>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Delete Account</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Permanently deletes your account, all rooms you own, and all associated data. This cannot be undone.
                        </p>
                      </div>
                      <button onClick={() => setShowDelete(true)}
                        className="flex-shrink-0 flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </button>
                    </div>

                    {showDelete && (
                      <div className="mt-5 p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                        <p className="text-sm text-red-400 font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Type your username to confirm deletion
                        </p>
                        <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                          placeholder={user?.username}
                          className="w-full bg-secondary border border-red-500/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                        <div className="flex gap-2">
                          <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                            className="flex-1 border border-border px-4 py-2 rounded-lg text-sm hover:bg-secondary transition-colors">
                            Cancel
                          </button>
                          <button disabled={deleteConfirm !== user?.username}
                            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            I understand, delete my account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {toast && <Toast {...toast} />}
    </div>
  );
}
