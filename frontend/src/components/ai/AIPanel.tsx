'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, Code2, Bug, Lightbulb, RefreshCw, FileText,
  X, Copy, Check, ArrowDownToLine, Wand2, Trash2,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useEditorStore } from '@/store/editor.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';

type AIMode = 'chat' | 'generate' | 'complete' | 'review' | 'debug' | 'explain' | 'refactor' | 'docs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const MODE_CONFIG: Record<AIMode, { icon: React.ElementType; label: string; placeholder: string; endpoint: string }> = {
  chat:     { icon: Bot,       label: 'Chat',     placeholder: 'Ask anything about coding...',           endpoint: '/api/ai/chat' },
  generate: { icon: Wand2,     label: 'Generate', placeholder: 'Describe the code you want to build...', endpoint: '/api/ai/generate' },
  complete: { icon: Code2,     label: 'Complete', placeholder: 'Describe what code to add...',           endpoint: '/api/ai/complete' },
  review:   { icon: FileText,  label: 'Review',   placeholder: 'What to focus on? (or just send)',       endpoint: '/api/ai/review' },
  debug:    { icon: Bug,       label: 'Debug',    placeholder: 'Paste the error message...',             endpoint: '/api/ai/debug' },
  explain:  { icon: Lightbulb, label: 'Explain',  placeholder: 'What part to explain? (or just send)',  endpoint: '/api/ai/explain' },
  refactor: { icon: RefreshCw, label: 'Refactor', placeholder: 'Describe the refactoring goal...',      endpoint: '/api/ai/refactor' },
  docs:     { icon: FileText,  label: 'Docs',     placeholder: 'Generate docs (or just send)',          endpoint: '/api/ai/docs' },
};

// ── Code block with Copy + Insert to Editor ──────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insert = () => {
    // Directly calling setValue on the Monaco ref triggers onDidChangeModelContent
    // which broadcasts the change to all collaborators via the existing socket flow.
    const { editorRef } = useEditorStore.getState() as any;
    if (editorRef) {
      editorRef.setValue(code);
    } else {
      const { revision } = useEditorStore.getState();
      useEditorStore.getState().setContent(code, revision);
    }
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-3 py-1 bg-black/40 border-b border-white/10">
        <span className="text-xs text-zinc-400 font-mono">{lang || 'code'}</span>
        <div className="flex gap-1">
          <button onClick={copy}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors">
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={insert}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors">
            <ArrowDownToLine className="h-3 w-3" />
            Insert
          </button>
        </div>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto bg-zinc-950 text-zinc-100 whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Parse assistant text into text / code segments ───────────────────────────
function parseContent(text: string): Array<{ type: 'text' | 'code'; content: string; lang?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
    parts.push({ type: 'code', content: m[2].trim(), lang: m[1] || undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', content: text }];
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, isStreaming, username, avatarStyle }: { msg: Message; isStreaming?: boolean; username?: string; avatarStyle?: string }) {
  if (msg.role === 'user') {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[82%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
        <Avatar seed={username ?? 'user'} size={24} avatarStyle={(avatarStyle as any) ?? 'avataaars'} className="mb-0.5 flex-shrink-0 ring-1 ring-primary/30" />
      </div>
    );
  }

  const parts = parseContent(msg.content);

  return (
    <div className="flex gap-2 justify-start">
      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="max-w-[90%] bg-secondary rounded-2xl rounded-tl-sm px-4 py-2.5 min-w-0">
        {parts.map((part, i) =>
          part.type === 'code'
            ? <CodeBlock key={i} code={part.content} lang={part.lang} />
            : <p key={i} className="text-sm whitespace-pre-wrap leading-relaxed">{part.content}</p>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-primary/70 animate-pulse rounded-sm align-middle ml-0.5" />
        )}
      </div>
    </div>
  );
}

// ── Main AI Panel ─────────────────────────────────────────────────────────────
export function AIPanel({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<AIMode>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fileContent, language, currentRoomId } = useEditorStore();
  const { user } = useAuthStore();
  const userAvatarStyle = (user?.avatar_style as any) ?? 'avataaars';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const userContent = input.trim();
    if (!userContent || streaming) return;

    const userMsg: Message = { role: 'user', content: userContent, ts: Date.now() };
    setMessages(m => [...m, userMsg, { role: 'assistant', content: '', ts: Date.now() }]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload: Record<string, any> = { roomId: currentRoomId, stream: true };

      if (mode === 'chat') {
        payload.message = userContent;
        const history = messages.slice(-6)
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n\n');
        if (history) payload.context = history;
      } else if (mode === 'generate') {
        payload.message = userContent;
      } else {
        payload.code = fileContent;
        payload.language = language;
        if (mode === 'debug') payload.error = userContent;
        if (mode === 'refactor') payload.instructions = userContent;
      }

      const token = Cookies.get('accessToken');
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}${MODE_CONFIG[mode].endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') break;
          try {
            const { chunk } = JSON.parse(raw);
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: last.content + chunk };
              return next;
            });
          } catch { /* partial JSON — skip */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], content: `Error: ${err.message}` };
        return next;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, mode, fileContent, language, currentRoomId, messages, streaming]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">AI Assistant</span>
          {streaming && <span className="text-xs text-muted-foreground animate-pulse">generating...</span>}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && !streaming && (
            <button onClick={() => setMessages([])}
              className="p-1 text-muted-foreground hover:text-foreground rounded" title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-border flex-wrap flex-shrink-0">
        {(Object.keys(MODE_CONFIG) as AIMode[]).map(m => {
          const { icon: Icon, label } = MODE_CONFIG[m];
          return (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}>
              <Icon className="h-3 w-3" />{label}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary opacity-60" />
            </div>
            <p className="font-medium text-sm mb-1">
              {mode === 'generate'
                ? 'Describe the code you want'
                : mode === 'chat'
                ? 'Ask anything about coding'
                : `${MODE_CONFIG[mode].label} your current file`}
            </p>
            <p className="text-xs opacity-50">Powered by Gemini 2.0 Flash</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            username={user?.username}
            avatarStyle={userAvatarStyle}
            isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={MODE_CONFIG[mode].placeholder}
            rows={2}
            disabled={streaming}
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none disabled:opacity-50"
          />
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 self-end transition-colors text-xs font-semibold">
              Stop
            </button>
          ) : (
            <button onClick={sendMessage} disabled={!input.trim()}
              className="bg-primary text-primary-foreground rounded-lg p-2.5 hover:bg-primary/90 disabled:opacity-40 self-end transition-colors">
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 opacity-50">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
