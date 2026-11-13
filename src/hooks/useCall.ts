import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptCall,
  cleanup,
  endCall,
  initiateCall,
  onIncomingCall,
  rejectCall,
  removeCall,
  type CallHandle,
  type CallType,
} from '../lib/calls';
import type { Conversation } from '../types/chat';

export function useCall(conversation: Conversation | null, currentUserId: string) {
  const [activeCall, setActiveCall] = useState<CallHandle | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; type: CallType; callerName: string } | null>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const activeCallRef = useRef<CallHandle | null>(null);
  const incomingUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Listen for incoming calls
  useEffect(() => {
    if (!conversation || conversation.is_group) return;
    const unsub = onIncomingCall(conversation.id, currentUserId, (callId, data) => {
      if (activeCallRef.current) return; // already in a call
      const otherUser = conversation.other_user;
      setIncomingCall({
        callId,
        type: data.type,
        callerName: otherUser?.display_name || otherUser?.username || 'Unknown',
      });
      setIsIncoming(true);
      setCallModalOpen(true);
    });
    incomingUnsubRef.current = unsub;
    return () => {
      unsub();
      incomingUnsubRef.current = null;
    };
  }, [conversation?.id, currentUserId]);

  const startCall = useCallback(
    async (type: CallType) => {
      if (!conversation || conversation.is_group) return;
      const otherUserId = conversation.other_user?.id;
      if (!otherUserId) return;
      try {
        const handle = await initiateCall(conversation.id, otherUserId, type);
        setActiveCall(handle);
        setIsIncoming(false);
        setCallModalOpen(true);
      } catch (err) {
        console.error('Failed to start call:', err);
      }
    },
    [conversation],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall || !conversation) return;
    try {
      const handle = await acceptCall(conversation.id, incomingCall.callId, incomingCall.type);
      setActiveCall(handle);
      setIsIncoming(false);
      // Keep modal open, now in active call mode
    } catch (err) {
      console.error('Failed to accept call:', err);
      setCallModalOpen(false);
      setIncomingCall(null);
    }
  }, [incomingCall, conversation]);

  const rejectIncoming = useCallback(async () => {
    if (!incomingCall || !conversation) return;
    try {
      await rejectCall(conversation.id, incomingCall.callId);
      await removeCall(conversation.id, incomingCall.callId);
    } catch {
      // ignore
    }
    setIncomingCall(null);
    setIsIncoming(false);
    setCallModalOpen(false);
  }, [incomingCall, conversation]);

  const endActiveCall = useCallback(async () => {
    const handle = activeCallRef.current;
    if (handle) {
      try {
        await endCall(handle.conversationId, handle.callId);
        await removeCall(handle.conversationId, handle.callId);
      } catch {
        // ignore
      }
      cleanup(handle);
      setActiveCall(null);
    }
    setIncomingCall(null);
    setIsIncoming(false);
    setCallModalOpen(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeCallRef.current) {
        cleanup(activeCallRef.current);
      }
    };
  }, []);

  return {
    activeCall,
    incomingCall,
    callModalOpen,
    isIncoming,
    startCall,
    acceptIncoming,
    rejectIncoming,
    endActiveCall,
    setCallModalOpen,
  };
}