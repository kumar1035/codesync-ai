'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Key, Bell, Code2, Save } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/api/users/profile', { username });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input value={user?.email || ''} disabled
                  className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Editor Preferences */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Editor Preferences</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Font size', defaultValue: '14', type: 'number' },
                { label: 'Tab size', defaultValue: '2', type: 'number' },
              ].map(({ label, defaultValue, type }) => (
                <div key={label}>
                  <label className="block text-sm font-medium mb-2">{label}</label>
                  <input type={type} defaultValue={defaultValue}
                    className="w-32 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              ))}
            </div>
          </div>

          {/* API Keys Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">AI Configuration</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              AI provider is configured server-side via environment variables. Current provider:
              <span className="text-primary font-medium ml-1">{process.env.NEXT_PUBLIC_AI_PROVIDER || 'openai'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
