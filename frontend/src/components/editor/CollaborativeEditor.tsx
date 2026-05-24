'use client';
import { useEffect, useRef, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Socket } from 'socket.io-client';
import { useEditorStore } from '@/store/editor.store';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  fileId: string;
  roomId: string;
  readOnly?: boolean;
  socket: Socket;
}

export function CollaborativeEditor({ fileId, roomId, readOnly = false, socket }: Props) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteChange = useRef(false);

  const { fileContent, language, revision, collaborators } = useEditorStore();
  const { user } = useAuthStore();

  const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    useEditorStore.getState().setEditorRef(editor);

    // Listen for content changes and broadcast
    editor.onDidChangeModelContent(() => {
      if (isRemoteChange.current) return;
      const content = editor.getValue();
      // Always read revision fresh from store — the closure would capture a stale value
      const currentRevision = useEditorStore.getState().revision;
      socket.emit('file:operation', {
        fileId, roomId,
        operation: { content },
        revision: currentRevision,
      });

      // Debounced typing indicator
      socket.emit('typing:start', { roomId, fileId });
      clearTimeout((editor as any)._typingTimeout);
      (editor as any)._typingTimeout = setTimeout(() => {
        socket.emit('typing:stop', { roomId, fileId });
      }, 1500);
    });

    // Broadcast cursor position
    editor.onDidChangeCursorPosition((e) => {
      socket.emit('cursor:update', {
        roomId, fileId,
        position: { lineNumber: e.position.lineNumber, column: e.position.column },
      });
    });
    return () => { useEditorStore.getState().setEditorRef(null); };
  }, [fileId, roomId, socket]);

  // Apply remote content changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentContent = editor.getValue();
    if (currentContent !== fileContent) {
      isRemoteChange.current = true;
      const position = editor.getPosition();
      editor.setValue(fileContent);
      if (position) editor.setPosition(position);
      isRemoteChange.current = false;
    }
  }, [fileContent]);

  // Render collaborator cursors
  useEffect(() => {
    const editor = editorRef.current;
    const m = monacoRef.current;
    if (!editor || !m) return;

    const decorations = collaborators
      .filter(c => c.userId !== user?.id && c.cursor)
      .map((c, i) => ({
        range: new m.Range(c.cursor!.lineNumber, c.cursor!.column, c.cursor!.lineNumber, c.cursor!.column),
        options: {
          className: `cursor-user-${i % 5}`,
          hoverMessage: { value: c.username },
          beforeContentClassName: `cursor-user-${i % 5}`,
        },
      }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [collaborators, user?.id]);

  return (
    <Editor
      height="100%"
      language={language}
      value={fileContent}
      onMount={handleEditorMount}
      options={{
        readOnly,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        minimap: { enabled: true, scale: 1 },
        lineNumbers: 'on',
        rulers: [80, 120],
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 16, bottom: 16 },
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggest: { showMethods: true, showFunctions: true },
        quickSuggestions: true,
        parameterHints: { enabled: true },
        formatOnPaste: true,
        formatOnType: true,
      }}
      theme="vs-dark"
    />
  );
}
