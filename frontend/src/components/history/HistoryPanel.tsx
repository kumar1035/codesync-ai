'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  History, RotateCcw, X, Clock, User, Loader2,
  FileCode2, Copy, Check, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Maximize2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Version {
  id: string;
  version_number: number;
  content_snapshot: string;
  created_by: string;
  created_by_username: string;
  created_at: string;
  change_summary: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 168) return `${Math.floor(h / 24)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function lineCount(content: string) {
  return content ? content.split('\n').length : 0;
}

function byteSize(content: string) {
  const b = new Blob([content || '']).size;
  if (b < 1024) return `${b}B`;
  return `${(b / 1024).toFixed(1)}KB`;
}

function SizeDiff({ current, previous }: { current: string; previous?: string }) {
  if (!previous) return null;
  const diff = lineCount(current) - lineCount(previous);
  if (diff === 0) return <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-2.5 w-2.5" />same</span>;
  if (diff > 0) return <span className="flex items-center gap-0.5 text-[10px] text-green-400"><TrendingUp className="h-2.5 w-2.5" />+{diff}</span>;
  return <span className="flex items-center gap-0.5 text-[10px] text-red-400"><TrendingDown className="h-2.5 w-2.5" />{diff}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-white/5 transition-colors">
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

interface Props {
  fileId: string | null;
  fileName: string;
  onClose: () => void;
}

export function HistoryPanel({ fileId, fileName, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullViewVersion, setFullViewVersion] = useState<Version | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Version | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const qc = useQueryClient();

  const { data: versions = [], isLoading } = useQuery<Version[]>({
    queryKey: ['history', fileId],
    queryFn: () => api.get(`/api/history/file/${fileId}`).then(r => r.data.data),
    enabled: !!fileId,
  });

  const restore = useMutation({
    mutationFn: (versionId: string) => api.post(`/api/history/restore/${versionId}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
      setConfirmRestore(null);
      setExpandedId(null);
      setRestoreSuccess(true);
      setTimeout(() => setRestoreSuccess(false), 3000);
    },
  });

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="relative flex flex-col h-full bg-card border-l border-border w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <History className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm">File History</p>
            <p className="text-xs text-muted-foreground truncate max-w-[160px]" title={fileName}>{fileName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Success toast */}
      {restoreSuccess && (
        <div className="mx-3 mt-3 flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 text-xs px-3 py-2 rounded-lg">
          <Check className="h-3.5 w-3.5 flex-shrink-0" />
          File restored successfully
        </div>
      )}

      {/* Summary bar (only when versions loaded) */}
      {versions.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-secondary/30 border-b border-border text-[11px] text-muted-foreground">
          <span><span className="text-foreground font-medium">{versions.length}</span> versions</span>
          <span><span className="text-foreground font-medium">{lineCount(versions[0]?.content_snapshot)} </span>lines now</span>
          <span><span className="text-foreground font-medium">{byteSize(versions[0]?.content_snapshot)}</span></span>
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!fileId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
            <FileCode2 className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No file selected</p>
            <p className="text-xs mt-1 opacity-60">Open a file to view its version history</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
            <History className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No versions yet</p>
            <p className="text-xs mt-2 opacity-60 leading-relaxed">
              Versions are saved automatically as you and your collaborators edit this file.
            </p>
          </div>
        ) : (
          <div className="py-2">
            {versions.map((v, i) => {
              const isExpanded = expandedId === v.id;
              const lines = lineCount(v.content_snapshot);
              const size = byteSize(v.content_snapshot);

              return (
                <div key={v.id} className="border-b border-border/50 last:border-0">
                  {/* Version row */}
                  <button onClick={() => toggle(v.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40 ${isExpanded ? 'bg-primary/5' : ''}`}>
                    {/* Timeline */}
                    <div className="flex flex-col items-center mt-1.5 flex-shrink-0 w-4">
                      <div className={`h-3 w-3 rounded-full border-2 ${
                        i === 0 ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`} />
                      {i < versions.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                            v{v.version_number}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">latest</span>
                          )}
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      </div>

                      {v.change_summary && (
                        <p className="text-xs text-foreground/80 mt-0.5 line-clamp-1">{v.change_summary}</p>
                      )}

                      <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />{timeAgo(v.created_at)}
                        </span>
                        {v.created_by_username && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-2.5 w-2.5" />{v.created_by_username}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{lines} lines · {size}</span>
                        <SizeDiff current={v.content_snapshot} previous={versions[i + 1]?.content_snapshot} />
                      </div>
                    </div>
                  </button>

                  {/* Expanded preview */}
                  {isExpanded && (
                    <div className="bg-zinc-950 mx-0">
                      {/* Preview toolbar */}
                      <div className="flex items-center justify-between px-3 py-1.5 border-t border-b border-white/5">
                        <span className="text-[10px] text-zinc-500">{lines} lines · {size}</span>
                        <div className="flex items-center gap-1">
                          <CopyButton text={v.content_snapshot} />
                          <button onClick={() => setFullViewVersion(v)}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors">
                            <Maximize2 className="h-3 w-3" />
                            Full
                          </button>
                        </div>
                      </div>

                      {/* Code preview — first 30 lines */}
                      <div className="overflow-x-auto max-h-52 overflow-y-auto">
                        <table className="w-full text-[11px] font-mono">
                          <tbody>
                            {(v.content_snapshot || '').split('\n').slice(0, 30).map((line, li) => (
                              <tr key={li} className="hover:bg-white/5">
                                <td className="text-right pr-3 pl-3 py-0.5 text-zinc-600 select-none w-8 border-r border-white/5">{li + 1}</td>
                                <td className="pl-3 pr-3 py-0.5 text-zinc-300 whitespace-pre">{line || ' '}</td>
                              </tr>
                            ))}
                            {lines > 30 && (
                              <tr>
                                <td className="text-right pr-3 pl-3 py-1 text-zinc-600 select-none w-8 border-r border-white/5">…</td>
                                <td className="pl-3 py-1 text-zinc-500 text-[10px]">{lines - 30} more lines — click Full to see all</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Restore button */}
                      {i !== 0 && (
                        <div className="px-3 py-2 border-t border-white/5">
                          <button onClick={() => setConfirmRestore(v)}
                            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors w-full justify-center">
                            <RotateCcw className="h-3 w-3" />
                            Restore to v{v.version_number}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm restore dialog */}
      {confirmRestore && (
        <div className="absolute inset-0 bg-black/70 flex items-end z-20 rounded-none">
          <div className="w-full bg-card border-t border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Restore to v{confirmRestore.version_number}?</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-xs text-muted-foreground">
              <p>· {lineCount(confirmRestore.content_snapshot)} lines · {byteSize(confirmRestore.content_snapshot)}</p>
              <p>· Saved {timeAgo(confirmRestore.created_at)} by {confirmRestore.created_by_username || 'unknown'}</p>
              <p className="text-yellow-400">· This will overwrite the current file content</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRestore(null)}
                className="flex-1 border border-border rounded-lg py-2 text-xs hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button onClick={() => restore.mutate(confirmRestore.id)} disabled={restore.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-xs hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
                {restore.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full content viewer modal */}
      {fullViewVersion && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFullViewVersion(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{fileName}</span>
                <span className="text-xs text-muted-foreground">— v{fullViewVersion.version_number}</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-zinc-400">
                  {lineCount(fullViewVersion.content_snapshot)} lines · {byteSize(fullViewVersion.content_snapshot)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={fullViewVersion.content_snapshot} />
                <button onClick={() => setFullViewVersion(null)} className="p-1 text-zinc-400 hover:text-white rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {(fullViewVersion.content_snapshot || '').split('\n').map((line, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="text-right pr-4 pl-4 py-0.5 text-zinc-600 select-none w-12 border-r border-white/5">{i + 1}</td>
                      <td className="pl-4 pr-4 py-0.5 text-zinc-200 whitespace-pre">{line || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-white/10 text-[11px] text-zinc-500 flex items-center gap-4">
              <span>Saved {timeAgo(fullViewVersion.created_at)}</span>
              {fullViewVersion.created_by_username && <span>by {fullViewVersion.created_by_username}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
