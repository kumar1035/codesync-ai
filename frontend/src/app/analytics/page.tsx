'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  Activity, Users, Code2, Bot, Zap, ArrowLeft, TrendingUp,
  CheckCircle2, XCircle, Loader2, Terminal, Clock, Hash,
  Timer, BarChart2, Table2, Globe, Cpu,
} from 'lucide-react';
import { api } from '@/lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const SERVICES = [
  { name: 'API Gateway',           port: 4000 },
  { name: 'Auth Service',          port: 4001 },
  { name: 'Collaboration Service', port: 4002 },
  { name: 'WebSocket Service',     port: 4003 },
  { name: 'AI Service',            port: 4004 },
  { name: 'Execution Service',     port: 4005 },
  { name: 'Analytics Service',     port: 4006 },
  { name: 'Notification Service',  port: 4007 },
  { name: 'History Service',       port: 4008 },
];

type Tab = 'overview' | 'executions' | 'ai' | 'events' | 'rooms';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview',   label: 'Overview',   icon: BarChart2 },
  { key: 'executions', label: 'Executions', icon: Terminal },
  { key: 'ai',         label: 'AI',         icon: Bot },
  { key: 'events',     label: 'Events',     icon: Activity },
  { key: 'rooms',      label: 'Rooms',      icon: Globe },
];

function ServiceHealth({ name, port }: { name: string; port: number }) {
  const { isLoading, isError } = useQuery({
    queryKey: ['health', port],
    queryFn: () => fetch(`http://localhost:${port}/health`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    retry: 1,
    refetchInterval: 15000,
  });
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : isError ? 'bg-red-400' : 'bg-green-400'}`} />
        <span className="text-sm">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {isLoading
          ? <span className="text-xs text-yellow-400">checking</span>
          : isError
          ? <span className="text-xs text-red-400">offline</span>
          : <span className="text-xs text-green-400">healthy</span>}
        <span className="text-xs text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">:{port}</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, sub }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start">
      <div className={`inline-flex p-2.5 rounded-xl ${bg} flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
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

function eventTypeBadge(type: string) {
  const map: Record<string, string> = {
    user_registered:  'bg-blue-400/10 text-blue-400',
    user_login:       'bg-green-400/10 text-green-400',
    code_execution:   'bg-yellow-400/10 text-yellow-400',
    ai_interaction:   'bg-purple-400/10 text-purple-400',
    room_created:     'bg-cyan-400/10 text-cyan-400',
    room_joined:      'bg-teal-400/10 text-teal-400',
    file_created:     'bg-orange-400/10 text-orange-400',
    collaboration_op: 'bg-pink-400/10 text-pink-400',
  };
  return map[type] ?? 'bg-secondary text-muted-foreground';
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

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

  const { data: activeRooms = [] } = useQuery({
    queryKey: ['analytics-active-rooms'],
    queryFn: () => api.get('/api/analytics/active-rooms').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: () => api.get('/api/analytics/events').then(r => r.data.data),
    refetchInterval: 15000,
    enabled: tab === 'events',
  });

  const executionByLanguage = executions.reduce((acc: any[], row: any) => {
    const existing = acc.find((a: any) => a.language === row.language);
    if (existing) { existing.count += parseInt(row.count); existing.avg_time = row.avg_execution_time_ms ? Math.round(parseFloat(row.avg_execution_time_ms)) : existing.avg_time; }
    else acc.push({ language: row.language, count: parseInt(row.count), avg_time: row.avg_execution_time_ms ? Math.round(parseFloat(row.avg_execution_time_ms)) : 0, success_rate: row.success_rate ? Math.round(parseFloat(row.success_rate)) : null });
    return acc;
  }, []);

  const totalExecutions = executionByLanguage.reduce((s: number, r: any) => s + r.count, 0);
  const totalAI = aiStats.reduce((s: number, r: any) => s + parseInt(r.count || 0), 0);

  const stats = [
    { icon: Users,      label: 'Registered Users',  value: overview?.total_registrations   || 0, color: 'text-blue-400',   bg: 'bg-blue-400/10',   sub: `${overview?.total_logins || 0} logins` },
    { icon: Code2,      label: 'Active Rooms',       value: overview?.active_rooms          || 0, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { icon: Zap,        label: 'Code Executions',    value: overview?.total_executions      || 0, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { icon: Bot,        label: 'AI Interactions',    value: overview?.total_ai_interactions || 0, color: 'text-pink-400',   bg: 'bg-pink-400/10' },
    { icon: TrendingUp, label: 'Collab Operations',  value: overview?.total_operations      || 0, color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
    { icon: Activity,   label: 'Total Events',       value: overview?.total_events          || 0, color: 'text-green-400',  bg: 'bg-green-400/10' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Real-time platform metrics across all services</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-lg px-3 py-1.5">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            Live — auto-refresh
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl mb-8">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Executions by language */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold">Code Executions by Language</h2>
                <p className="text-xs text-muted-foreground mb-4">Total runs per language</p>
                {executionByLanguage.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={executionByLanguage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="language" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* AI usage donut */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold">AI Usage by Mode</h2>
                <p className="text-xs text-muted-foreground mb-4">Distribution of AI interactions</p>
                {aiStats.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={aiStats} dataKey="count" nameKey="interaction_type"
                          cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                          {aiStats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {aiStats.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-muted-foreground capitalize flex-1 truncate">{s.interaction_type}</span>
                          <span className="text-xs font-semibold tabular-nums">{parseInt(s.count).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Latency bar */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold">AI Response Latency</h2>
                <p className="text-xs text-muted-foreground mb-4">Average milliseconds per mode</p>
                {aiStats.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={aiStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="interaction_type" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(v: any) => [`${Math.round(v)}ms`, 'Avg Latency']} />
                      <Bar dataKey="avg_latency" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* System Health */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold">System Health</h2>
                <p className="text-xs text-muted-foreground mb-3">Live status of all microservices</p>
                <div className="divide-y divide-border/50">
                  {SERVICES.map(({ name, port }) => (
                    <ServiceHealth key={port} name={name} port={port} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Executions Tab */}
        {tab === 'executions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={Zap}   label="Total Executions" value={totalExecutions} color="text-purple-400" bg="bg-purple-400/10" />
              <StatCard icon={Code2} label="Languages Used"   value={executionByLanguage.length} color="text-blue-400" bg="bg-blue-400/10" />
              <StatCard icon={Timer} label="Avg Exec Time"    value={executionByLanguage.length ? `${Math.round(executionByLanguage.reduce((s: number, r: any) => s + r.avg_time, 0) / executionByLanguage.length)}ms` : '—'} color="text-yellow-400" bg="bg-yellow-400/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Executions by Language</h2>
                {executionByLanguage.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={executionByLanguage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="language" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Avg Execution Time (ms)</h2>
                {executionByLanguage.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={executionByLanguage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="language" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(v: any) => [`${v}ms`, 'Avg Time']} />
                      <Bar dataKey="avg_time" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Detailed table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Execution Details by Language</h2>
              </div>
              {executionByLanguage.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No execution data yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Runs</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Time</th>
                        <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {executionByLanguage.sort((a: any, b: any) => b.count - a.count).map((row: any, i: number) => {
                        const share = totalExecutions > 0 ? (row.count / totalExecutions) * 100 : 0;
                        return (
                          <tr key={row.language} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="font-medium capitalize">{row.language}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums font-semibold">{row.count.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{share.toFixed(1)}%</td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{row.avg_time > 0 ? `${row.avg_time}ms` : '—'}</td>
                            <td className="px-6 py-4 w-40">
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-secondary/20">
                        <td className="px-6 py-3 text-xs font-semibold text-muted-foreground">Total</td>
                        <td className="px-6 py-3 text-right tabular-nums font-bold">{totalExecutions.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground text-xs">100%</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Tab */}
        {tab === 'ai' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={Bot}    label="Total AI Requests" value={totalAI} color="text-pink-400"   bg="bg-pink-400/10" />
              <StatCard icon={Hash}   label="Interaction Modes" value={aiStats.length} color="text-blue-400"   bg="bg-blue-400/10" />
              <StatCard icon={Timer}  label="Overall Avg Latency" value={aiStats.length ? `${Math.round(aiStats.reduce((s: number, r: any) => s + parseFloat(r.avg_latency || 0), 0) / aiStats.length)}ms` : '—'} color="text-green-400" bg="bg-green-400/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Usage by Interaction Type</h2>
                {aiStats.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={aiStats} dataKey="count" nameKey="interaction_type"
                        cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                        label={({ interaction_type, percent }: any) => `${interaction_type} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {aiStats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Latency by Mode</h2>
                {aiStats.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={aiStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: any) => `${v}ms`} />
                      <YAxis dataKey="interaction_type" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={70} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(v: any) => [`${Math.round(v)}ms`, 'Avg Latency']} />
                      <Bar dataKey="avg_latency" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* AI stats table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">AI Interaction Details</h2>
              </div>
              {aiStats.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No AI data yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requests</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Latency</th>
                        <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {aiStats.sort((a: any, b: any) => parseInt(b.count) - parseInt(a.count)).map((row: any, i: number) => {
                        const count = parseInt(row.count);
                        const share = totalAI > 0 ? (count / totalAI) * 100 : 0;
                        return (
                          <tr key={row.interaction_type} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="font-medium capitalize">{row.interaction_type}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums font-semibold">{count.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{share.toFixed(1)}%</td>
                            <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">{row.avg_latency ? `${Math.round(parseFloat(row.avg_latency))}ms` : '—'}</td>
                            <td className="px-6 py-4 w-40">
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {tab === 'events' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Recent Platform Events</h2>
                </div>
                <span className="text-xs text-muted-foreground">{events.length} events</span>
              </div>

              {eventsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Activity className="h-10 w-10 mb-3 opacity-20" />
                  <p className="font-medium">No events recorded yet</p>
                  <p className="text-xs mt-1 opacity-60">Events will appear here as the platform is used</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Type</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {events.slice(0, 50).map((event: any, i: number) => (
                        <tr key={event.id ?? i} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${eventTypeBadge(event.event_type)}`}>
                              {event.event_type?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-muted-foreground font-mono">
                            {event.user_id ? event.user_id.slice(0, 8) + '…' : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-muted-foreground max-w-[140px] truncate">
                            {event.room_id ? event.room_id.slice(0, 8) + '…' : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                            {event.metadata ? JSON.stringify(event.metadata).slice(0, 60) : '—'}
                          </td>
                          <td className="px-6 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {timeAgo(event.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {tab === 'rooms' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={Globe}   label="Active Rooms"  value={overview?.active_rooms || 0} color="text-yellow-400" bg="bg-yellow-400/10" />
              <StatCard icon={Users}   label="Total Members" value={activeRooms.reduce((s: number, r: any) => s + parseInt(r.member_count || 0), 0)} color="text-blue-400" bg="bg-blue-400/10" />
              <StatCard icon={TrendingUp} label="Collab Ops" value={overview?.total_operations || 0} color="text-cyan-400" bg="bg-cyan-400/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Room bar chart */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Members per Room</h2>
                {activeRooms.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No room data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={activeRooms.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis dataKey="room_name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                      <Bar dataKey="member_count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Rooms leaderboard */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">Room Leaderboard</h2>
                {activeRooms.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No room data yet</div>
                ) : (
                  <div className="space-y-3">
                    {activeRooms.slice(0, 8).map((room: any, i: number) => {
                      const maxMembers = parseInt(activeRooms[0]?.member_count || 1);
                      const pct = Math.min(100, (parseInt(room.member_count) / maxMembers) * 100);
                      return (
                        <div key={room.id} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 flex-shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            #{i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm truncate font-medium">{room.room_name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                                <Users className="h-3 w-3" />{room.member_count}
                              </span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Room details table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">All Rooms</h2>
              </div>
              {activeRooms.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No room data yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Name</th>
                        <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</th>
                        <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {activeRooms.map((room: any, i: number) => {
                        const maxMembers = parseInt(activeRooms[0]?.member_count || 1);
                        const pct = Math.min(100, (parseInt(room.member_count) / maxMembers) * 100);
                        return (
                          <tr key={room.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-6 py-3 text-muted-foreground text-xs">{i + 1}</td>
                            <td className="px-6 py-3 font-medium">{room.room_name}</td>
                            <td className="px-6 py-3 text-right tabular-nums font-semibold">{parseInt(room.member_count).toLocaleString()}</td>
                            <td className="px-6 py-3 w-48">
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
