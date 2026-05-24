import { create } from 'zustand';

interface Collaborator {
  userId: string;
  username: string;
  socketId: string;
  color: string;
  cursor?: { lineNumber: number; column: number };
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  ts: number;
}

interface EditorState {
  currentRoomId: string | null;
  currentFileId: string | null;
  fileContent: string;
  language: string;
  revision: number;
  collaborators: Collaborator[];
  chatMessages: ChatMessage[];
  isConnected: boolean;
  typingUsers: Set<string>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorRef: any | null;

  setRoom: (roomId: string) => void;
  setFile: (fileId: string, content: string, language: string) => void;
  setContent: (content: string, revision: number) => void;
  setLanguage: (language: string) => void;
  setCollaborators: (collaborators: Collaborator[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setConnected: (connected: boolean) => void;
  setTyping: (userId: string, typing: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditorRef: (ref: any | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentRoomId: null,
  currentFileId: null,
  fileContent: '',
  language: 'javascript',
  revision: 0,
  collaborators: [],
  chatMessages: [],
  isConnected: false,
  typingUsers: new Set(),
  editorRef: null,

  setRoom: (roomId) => set({ currentRoomId: roomId }),
  setFile: (fileId, content, language) => set({ currentFileId: fileId, fileContent: content, language, revision: 0 }),
  setContent: (content, revision) => set({ fileContent: content, revision }),
  setLanguage: (language) => set({ language }),
  setCollaborators: (collaborators) => set({ collaborators }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-100), msg] })),
  setConnected: (connected) => set({ isConnected: connected }),
  setTyping: (userId, typing) => set((s) => {
    const next = new Set(s.typingUsers);
    typing ? next.add(userId) : next.delete(userId);
    return { typingUsers: next };
  }),
  setEditorRef: (ref) => set({ editorRef: ref }),
}));
