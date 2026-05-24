'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Code2, Bot, Zap, ArrowLeft, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const router = useRouter();

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/api/analytics/overview').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['analytics-executions'],
    queryFn: () => api.get('/api/analytics/executions').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: aiStats = [] } = useQuery({
    queryKey: ['analytics-ai'],
    queryFn: () => api.get('/api/analytics/ai').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const stats = [
    { icon: Users, label: 'Total Users', value: overview?.total_registrations || 0, color: 'text-blue-400' },
    { icon: Activity, label: 'Total Logins', value: overview?.total_logins || 0, color: 'text-green-400' },
    { icon: Code2, label: 'Active Rooms', value: overview?.active_rooms || 0, color: 'text-yellow-400' },
    { icon: Zap, label: 'Code Executions', value: overview?.total_executions || 0, color: 'text-purple-400' },
    { icon: Bot, label: 'AI Interactions', value: overview?.total_ai_interactions || 0, color: 'text-pink-400' },
    { icon: TrendingUp, label: 'Collaborations', value: overview?.total_operations || 0, color: 'text-cyan-400' },
  ];

  const executionByLanguage = executions.reduce((acc: any[], row: any) => {
    const existing = acc.find(a => a.language === row.language);
    if (existing) existing.count += parseInt(row.count);
    else acc.push({ language: row.language, count: parseInt(row.count) });
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Real-time platform metrics</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            Live — updates every 10s
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <Icon className={`h-5 w-5 ${color} mb-2`} />
              <div className="text-2xl font-bold">{value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Executions by Language */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4">Code Executions by Language</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={executionByLanguage}>
                <XAxis dataKey="language" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Usage by Type */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4">AI Usage by Type</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={aiStats} dataKey="count" nameKey="interaction_type" cx="50%" cy="50%" outerRadius={80} label={({ interaction_type, percent }) => `${interaction_type} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {aiStats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* AI Latency */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4">AI Response Latency (ms)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aiStats}>
                <XAxis dataKey="interaction_type" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="avg_latency" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* System Health */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4">System Health</h2>
            <div className="space-y-3">
              {[
                { service: 'API Gateway', port: 4000 },
                { service: 'Auth Service', port: 4001 },
                { service: 'WebSocket Service', port: 4003 },
                { service: 'AI Service', port: 4004 },
                { service: 'Execution Service', port: 4005 },
              ].map(({ service, port }) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="text-sm">{service}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-green-400 rounded-full" />
                    <span className="text-xs text-muted-foreground">:{port}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
