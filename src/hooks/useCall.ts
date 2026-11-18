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
import { onValue, ref } from 'firebase/database';
import { getRtdb } from '../lib/firebase';
import { setCallStatus } from '../lib/calls';
import { insertMessage } from '../lib/chatApi';
import { currentUserId as getCurrentUserId } from '../lib/chatApi';
import type { Conversation } from '../types/chat';

// Ringtone for incoming calls
function playRingtone(): () => void {
  const AudioCtx = (window as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext || (window as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  let stopped = false;
  const play = () => {
    if (stopped) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      if (stopped) return;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 480;
      gain2.gain.value = 0.08;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.15);
    }, 200);
  };
  const interval = setInterval(play, 1500);
  play();
  return () => {
    stopped = true;
    clearInterval(interval);
    ctx.close().catch(() => {});
  };
}
export function useCall(conversation: Conversation | null, currentUserId: string) {
  const [activeCall, setActiveCall] = useState<CallHandle | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callId: string; type: CallType; callerName: string } | null>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const activeCallRef = useRef<CallHandle | null>(null);
  const callStartRef = useRef<number | null>(null);
  const terminatingRef = useRef(false);
  const acceptedRef = useRef(false);
  const statusUnsubRef = useRef<(() => void) | null>(null);
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
      // Play ringtone
      const stopRingtone = playRingtone();
      (window as { __stopRingtone?: () => void }).__stopRingtone = stopRingtone;
    });
    incomingUnsubRef.current = unsub;
    return () => {
      unsub();
      incomingUnsubRef.current = null;
      if ((window as { __stopRingtone?: () => void }).__stopRingtone) {
        (window as { __stopRingtone?: () => void }).__stopRingtone!();
        delete (window as { __stopRingtone?: () => void }).__stopRingtone;
      }
    };
  }, [conversation, currentUserId]);

  const startCall = useCallback(
    async (type: CallType) => {
      if (!conversation || conversation.is_group) return;
      const otherUserId = conversation.other_user?.id;
      if (!otherUserId) return;
      terminatingRef.current = false;
      acceptedRef.current = false;
      try {
        const handle = await initiateCall(conversation.id, otherUserId, type);
        setActiveCall(handle);
        setIsIncoming(false);
        setCallModalOpen(true);
        callStartRef.current = Date.now();

        // Missed-call timeout (caller side): if not accepted within 30s, mark missed.
        const missedTimer = window.setTimeout(async () => {
          if (terminatingRef.current) return;
          terminatingRef.current = true;
          try {
            await setCallStatus(conversation.id, handle.callId, 'missed');
          } catch {
            // ignore
          }
          try {
            cleanup(handle);
          } catch {
            // ignore
          }
          setActiveCall(null);
          setIncomingCall(null);
          setIsIncoming(false);
          setCallModalOpen(false);
          // Caller writes a missed-call log message.
          try {
            const icon = type === 'video' ? '📹' : '📞';
            await insertMessage({
              conversationId: conversation.id,
              senderId: getCurrentUserId(),
              clientId: `call_${Date.now()}`,
              content: `${icon} ${type === 'video' ? 'Video' : 'Voice'} call · missed`,
              messageType: 'call',
            });
          } catch {
            // ignore
          }
        }, 30000);

        // Listen for callee-side status changes to terminate cleanly.
        const unsub = onValue(
          ref(getRtdb(), `calls/${conversation.id}/${handle.callId}/status`),
          (snap) => {
            const st = snap.val() as string;
            if (st === 'accepted') {
              acceptedRef.current = true;
              return;
            }
            if (st === 'rejected' || st === 'cancelled' || st === 'ended' || st === 'missed') {
              window.clearTimeout(missedTimer);
              if (terminatingRef.current) return;
              terminatingRef.current = true;
              const type = handle.type;
              try {
                cleanup(handle);
              } catch {
                // ignore
              }
              setActiveCall(null);
              setIncomingCall(null);
              setIsIncoming(false);
              setCallModalOpen(false);
              if (statusUnsubRef.current) {
                statusUnsubRef.current();
                statusUnsubRef.current = null;
              }
              if (st === 'rejected') {
                const icon = type === 'video' ? '📹' : '📞';
                insertMessage({
                  conversationId: conversation.id,
                  senderId: getCurrentUserId(),
                  clientId: `call_${Date.now()}`,
                  content: `${icon} ${type === 'video' ? 'Video' : 'Voice'} call · declined`,
                  messageType: 'call',
                }).catch(() => {});
              }
            }
          },
        );
        statusUnsubRef.current = unsub;
        // store timer id for cleanup on unmount? best-effort; cleared via terminatingRef guard
        void missedTimer;
      } catch (err) {
        console.error('Failed to start call:', err);
      }
    },
    [conversation],
  );

  const acceptIncoming = useCallback(async () => {
    if ((window as { __stopRingtone?: () => void }).__stopRingtone) {
      (window as { __stopRingtone?: () => void }).__stopRingtone!();
      delete (window as { __stopRingtone?: () => void }).__stopRingtone;
    }
    if (!incomingCall || !conversation) return;
    terminatingRef.current = false;
    try {
      const handle = await acceptCall(conversation.id, incomingCall.callId, incomingCall.type);
      setActiveCall(handle);
      setIsIncoming(false);
      acceptedRef.current = true;
      callStartRef.current = Date.now();
      // Keep modal open, now in active call mode
      const unsub = onValue(
        ref(getRtdb(), `calls/${conversation.id}/${incomingCall.callId}/status`),
        (snap) => {
          const st = snap.val() as string;
          if (st === 'ended' || st === 'rejected' || st === 'cancelled' || st === 'missed') {
            if (terminatingRef.current) return;
            terminatingRef.current = true;
            try {
              cleanup(handle);
            } catch {
              // ignore
            }
            setActiveCall(null);
            setIncomingCall(null);
            setIsIncoming(false);
            setCallModalOpen(false);
            if (statusUnsubRef.current) {
              statusUnsubRef.current();
              statusUnsubRef.current = null;
            }
          }
        },
      );
      statusUnsubRef.current = unsub;
    } catch (err) {
      console.error('Failed to accept call:', err);
      setCallModalOpen(false);
      setIncomingCall(null);
    }
  }, [incomingCall, conversation]);

  const rejectIncoming = useCallback(async () => {
    if ((window as { __stopRingtone?: () => void }).__stopRingtone) {
      (window as { __stopRingtone?: () => void }).__stopRingtone!();
      delete (window as { __stopRingtone?: () => void }).__stopRingtone;
    }
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
      terminatingRef.current = true;
      const isCaller = handle.isCaller;
      const type = handle.type;
      const wasAccepted = acceptedRef.current;
      const startedAt = callStartRef.current;
      try {
        if (wasAccepted) {
          await endCall(handle.conversationId, handle.callId);
        } else {
          await setCallStatus(handle.conversationId, handle.callId, 'cancelled');
        }
        await removeCall(handle.conversationId, handle.callId);
      } catch {
        // ignore
      }
      cleanup(handle);
      setActiveCall(null);
      if (statusUnsubRef.current) {
        statusUnsubRef.current();
        statusUnsubRef.current = null;
      }
      // Caller writes a call-log message with duration.
      if (isCaller && handle.conversationId) {
        try {
          const durationSec = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
          const m = Math.floor(durationSec / 60);
          const sec = durationSec % 60;
          const icon = type === 'video' ? '📹' : '📞';
          const label = wasAccepted
            ? `${icon} ${type === 'video' ? 'Video' : 'Voice'} call · ${m}:${sec.toString().padStart(2, '0')}`
            : `${icon} ${type === 'video' ? 'Video' : 'Voice'} call · cancelled`;
          await insertMessage({
            conversationId: handle.conversationId,
            senderId: getCurrentUserId(),
            clientId: `call_${Date.now()}`,
            content: label,
            messageType: 'call',
          });
        } catch {
          // ignore
        }
      }
    }
    callStartRef.current = null;
    acceptedRef.current = false;
    setIncomingCall(null);
    setIsIncoming(false);
    setCallModalOpen(false);
  }, []);

  // Close incoming modal if the caller cancels/misses/ends before accept.
  useEffect(() => {
    if (!incomingCall || !conversation) return;
    const unsub = onValue(
      ref(getRtdb(), `calls/${conversation.id}/${incomingCall.callId}/status`),
      (snap) => {
        const st = snap.val() as string;
        if (st === 'cancelled' || st === 'missed' || st === 'ended' || st === 'rejected') {
          if ((window as { __stopRingtone?: () => void }).__stopRingtone) {
            (window as { __stopRingtone?: () => void }).__stopRingtone!();
            delete (window as { __stopRingtone?: () => void }).__stopRingtone;
          }
          setIncomingCall(null);
          setIsIncoming(false);
          setCallModalOpen(false);
        }
      },
    );
    return () => unsub();
  }, [incomingCall, conversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminatingRef.current = true;
      if (statusUnsubRef.current) {
        try {
          statusUnsubRef.current();
        } catch {
          // ignore
        }
        statusUnsubRef.current = null;
      }
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