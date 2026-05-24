'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Bot, Users, FileText, MessageSquare, History, Settings,
  ChevronLeft, Plus, Terminal, X, Wifi, WifiOff, Loader2, Trash2
} from 'lucide-react';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { Avatar } from '@/components/ui/Avatar';
import { AIPanel } from '@/components/ai/AIPanel';
import { HistoryPanel } from '@/components/history/HistoryPanel';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { api } from '@/lib/api';
import { useEditorStore } from '@/store/editor.store';
import { useSocket } from '@/hooks/useSocket';
import { LANGUAGE_OPTIONS } from '@/lib/utils';

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const router = useRouter();
  const socket = useSocket();
  const qc = useQueryClient();

  const { isConnected, collaborators, chatMessages, addChatMessage, typingUsers, setFile, setRoom } = useEditorStore();

  const [activeFile, setActiveFile] = useState<any>(null);
  const [showAI, setShowAI] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLang, setNewFileLang] = useState('javascript');
  const [showHistory, setShowHistory] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [executionOutput, setExecutionOutput] = useState('');

  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.get(`/api/rooms/${roomId}`).then(r => r.data.data),
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files', roomId],
    queryFn: () => api.get(`/api/files/room/${roomId}`).then(r => r.data.data),
  });

  const createFile = useMutation({
    mutationFn: () => api.post(`/api/files/room/${roomId}`, { filename: newFileName, language: newFileLang }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['files', roomId] }); setShowNewFile(false); setNewFileName(''); },
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => api.delete(`/api/files/${fileId}`),
    onSuccess: (_, fileId) => {
      qc.invalidateQueries({ queryKey: ['files', roomId] });
      if (activeFile?.id === fileId) setActiveFile(null);
    },
  });

  const executeCode = useMutation({
    mutationFn: () => api.post('/api/execute', { language: activeFile?.language, code: useEditorStore.getState().fileContent, roomId }),
    onSuccess: (res) => {
      const { stdout, stderr, exitCode, executionTimeMs } = res.data.data;
      setExecutionOutput(`Exit: ${exitCode} | Time: ${executionTimeMs}ms\n\n${stdout}${stderr ? '\nSTDERR:\n' + stderr : ''}`);
      setShowOutput(true);
    },
    onError: (err: any) => { setExecutionOutput(`Error: ${err.response?.data?.error || err.message}`); setShowOutput(true); },
  });

  // Join room on mount
  useEffect(() => {
    setRoom(roomId);
    socket.emit('room:join', { roomId });
    return () => { socket.emit('room:leave', { roomId }); };
  }, [roomId]);

  // Load file when selected
  const loadFile = async (file: any) => {
    const { data } = await api.get(`/api/files/${file.id}`);
    const f = data.data;
    setActiveFile(f);
    // Reset content + revision — server will send authoritative file:state after room:join
    setFile(f.id, f.content, f.language);
    socket.emit('room:join', { roomId, fileId: f.id });
  };

  useEffect(() => {
    if (files.length > 0 && !activeFile) loadFile(files[0]);
  }, [files]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    socket.emit('chat:message', { roomId, message: chatInput });
    setChatInput('');
  };

  const handleExecute = () => {
    executeCode.mutate();
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 flex items-center gap-3 px-4 border-b border-border bg-card/50 flex-shrink-0">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold text-sm truncate">{room?.room_name || 'Loading...'}</div>
        <div className="ml-auto flex items-center gap-2">
          {/* Connected indicator */}
          <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isConnected ? 'Connected' : 'Reconnecting'}
          </div>

          {/* Collaborator avatars */}
          <div className="flex -space-x-2">
            {collaborators.slice(0, 5).map((c) => (
              <div key={c.userId} title={c.username}>
                <Avatar
                  seed={c.username}
                  size={26}
                  borderColor={c.color}
                  className="border-background"
                />
              </div>
            ))}
            {collaborators.length > 5 && (
              <div className="h-[26px] w-[26px] rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border-2 border-background z-10">
                +{collaborators.length - 5}
              </div>
            )}
          </div>

          <button onClick={handleExecute} disabled={!activeFile || executeCode.isPending}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 transition-colors">
            {executeCode.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </button>
          <button onClick={() => setShowAI(!showAI)}
            className={`p-1.5 rounded-md transition-colors ${showAI ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <Bot className="h-4 w-4" />
          </button>
          <button onClick={() => setShowChat(!showChat)}
            className={`p-1.5 rounded-md transition-colors ${showChat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <MessageSquare className="h-4 w-4" />
          </button>
          <button onClick={() => setShowHistory(!showHistory)} title="File History"
            className={`p-1.5 rounded-md transition-colors ${showHistory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <History className="h-4 w-4" />
          </button>
          <NotificationBell />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-48 bg-card border-r border-border flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</span>
            <button onClick={() => setShowNewFile(true)} className="p-0.5 text-muted-foreground hover:text-foreground rounded">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {files.map((file: any) => (
              <div key={file.id}
                className={`group flex items-center gap-1 mx-1 rounded-md transition-colors ${activeFile?.id === file.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                <button onClick={() => loadFile(file)} className="flex-1 text-left px-3 py-1.5 flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate text-xs">{file.filename}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${file.filename}"?`)) deleteFile.mutate(file.id); }}
                  className="p-1 mr-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all rounded"
                  title="Delete file">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {showNewFile && (
              <div className="px-2 py-1">
                <input value={newFileName} onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createFile.mutate(); if (e.key === 'Escape') setShowNewFile(false); }}
                  className="w-full bg-secondary border border-primary/50 rounded px-2 py-1 text-xs focus:outline-none"
                  placeholder="filename.js" autoFocus />
                <select value={newFileLang} onChange={e => setNewFileLang(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs mt-1">
                  {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeFile ? (
            <div className="flex-1 min-h-0">
              <CollaborativeEditor key={activeFile.id} fileId={activeFile.id} roomId={roomId} socket={socket} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select or create a file to start editing</p>
              </div>
            </div>
          )}

          {/* Output Panel */}
          {showOutput && (
            <div className="h-48 border-t border-border bg-card flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Terminal className="h-4 w-4" /> Output
                </div>
                <button onClick={() => setShowOutput(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-green-400 whitespace-pre-wrap">{executionOutput}</pre>
            </div>
          )}
        </div>

        {/* AI Panel */}
        {showAI && (
          <div className="w-80 flex-shrink-0">
            <AIPanel onClose={() => setShowAI(false)} />
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <HistoryPanel
            fileId={activeFile?.id ?? null}
            fileName={activeFile?.filename ?? 'No file selected'}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="w-72 flex-shrink-0 flex flex-col bg-card border-l border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Chat</span>
              <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map(msg => (
                <div key={msg.id} className="text-sm">
                  <span className="font-medium text-primary">{msg.username}: </span>
                  <span className="text-foreground">{msg.message}</span>
                </div>
              ))}
              {typingUsers.size > 0 && (
                <div className="text-xs text-muted-foreground italic">
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Type a message..." />
              <button onClick={handleSendChat} className="bg-primary text-primary-foreground rounded-lg p-2 hover:bg-primary/90">
                <Play className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
