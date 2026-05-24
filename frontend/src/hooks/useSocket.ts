'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useEditorStore } from '@/store/editor.store';
import { getCollaboratorColor } from '@/lib/utils';

let socketInstance: Socket | null = null;

export function useSocket() {
  const store = useEditorStore();

  const getSocket = (): Socket => {
    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4003', {
        auth: { token: Cookies.get('accessToken') },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
    }
    return socketInstance;
  };

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => store.setConnected(true);
    const onDisconnect = () => store.setConnected(false);

    const onPresence = ({ members }: { members: any[] }) => {
      const collaborators = members.map((m: any, i: number) => ({
        ...m, color: getCollaboratorColor(i),
      }));
      store.setCollaborators(collaborators);
    };

    const onOperationBroadcast = ({ fileId: fid, operation, revision }: any) => {
      if (fid !== useEditorStore.getState().currentFileId) return;
      if (operation.content !== undefined) {
        store.setContent(operation.content, revision);
      }
    };

    // Server ACKs our own operations — update local revision so next op sends the right number
    const onOperationAck = ({ ok, revision, fileId: fid }: any) => {
      if (ok && fid === useEditorStore.getState().currentFileId)
        store.setContent(useEditorStore.getState().fileContent, revision);
    };

    const onFileState = ({ fileId: fid, content, revision }: any) => {
      if (fid === useEditorStore.getState().currentFileId) store.setContent(content, revision);
    };

    const onChatBroadcast = (msg: any) => store.addChatMessage(msg);

    const onTypingBroadcast = ({ userId, username, typing }: any) => {
      store.setTyping(userId, typing);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:presence', onPresence);
    socket.on('file:operation:broadcast', onOperationBroadcast);
    socket.on('file:operation:ack', onOperationAck);
    socket.on('file:state', onFileState);
    socket.on('chat:broadcast', onChatBroadcast);
    socket.on('typing:broadcast', onTypingBroadcast);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:presence', onPresence);
      socket.off('file:operation:broadcast', onOperationBroadcast);
      socket.off('file:operation:ack', onOperationAck);
      socket.off('file:state', onFileState);
      socket.off('chat:broadcast', onChatBroadcast);
      socket.off('typing:broadcast', onTypingBroadcast);
    };
  }, []);

  return getSocket();
}
