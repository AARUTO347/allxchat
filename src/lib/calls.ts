// WebRTC voice/video calling via Firebase RTDB signaling.
// Uses free Google STUN servers for NAT traversal (no TURN server needed).
// Peer-to-peer connection; media flows directly between browsers.

import { get, onValue, ref, remove, set, update } from 'firebase/database';
import { getRtdb } from './firebase';
import { currentUserId } from './chatApi';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';

export interface CallDoc {
  callerId: string;
  calleeId: string;
  type: CallType;
  status: CallStatus;
  offer: string | null;
  answer: string | null;
  createdAt: string;
}

export interface CallHandle {
  callId: string;
  conversationId: string;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  remoteStream: MediaStream;
  type: CallType;
  isCaller: boolean;
}

// Create a new call (caller side)
export async function initiateCall(
  conversationId: string,
  calleeId: string,
  type: CallType,
): Promise<CallHandle> {
  const db = getRtdb();
  const callerId = currentUserId();
  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const callRef = ref(db, `calls/${conversationId}/${callId}`);

  // Get local media
  const constraints: MediaStreamConstraints =
    type === 'video'
      ? { audio: true, video: { width: 640, height: 480 } }
      : { audio: true, video: false };

  const localStream = await navigator.mediaDevices.getUserMedia(constraints);

  // Create peer connection
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  const remoteStream = new MediaStream();
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
  };

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Write call to RTDB
  await set(callRef, {
    callerId,
    calleeId,
    type,
    status: 'ringing',
    offer: JSON.stringify(offer),
    answer: null,
    createdAt: new Date().toISOString(),
  });

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const candidateRef = ref(db, `calls/${conversationId}/${callId}/iceCandidates/${callerId}/${Date.now()}`);
      set(candidateRef, JSON.stringify(event.candidate)).catch(() => {});
    }
  };

  // Listen for answer
  const answerUnsubscribe = onValue(ref(db, `calls/${conversationId}/${callId}/answer`), async (snap) => {
    if (snap.exists() && pc.signalingState === 'have-local-offer') {
      const answer = JSON.parse(snap.val() as string);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  });

  // Listen for callee's ICE candidates
  const iceUnsubscribe = onValue(ref(db, `calls/${conversationId}/${callId}/iceCandidates/${calleeId}`), (snap) => {
    if (snap.exists()) {
      const val = snap.val() as Record<string, string>;
      Object.values(val).forEach(async (candidateStr) => {
        try {
          const candidate = JSON.parse(candidateStr);
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore
        }
      });
    }
  });

  // Listen for status changes (rejected/ended)
  const statusUnsubscribe = onValue(ref(db, `calls/${conversationId}/${callId}/status`), (snap) => {
    const status = snap.val() as CallStatus;
    if (status === 'rejected' || status === 'ended' || status === 'missed') {
      cleanup(callHandle);
    }
  });

  const callHandle: CallHandle = {
    callId,
    conversationId,
    peerConnection: pc,
    localStream,
    remoteStream,
    type,
    isCaller: true,
  };

  // Store unsubscribe functions for cleanup
  (callHandle as { _unsubs?: Array<() => void> })._unsubs = [answerUnsubscribe, iceUnsubscribe, statusUnsubscribe];

  return callHandle;
}

// Accept a call (callee side)
export async function acceptCall(
  conversationId: string,
  callId: string,
  type: CallType,
): Promise<CallHandle> {
  const db = getRtdb();
  const calleeId = currentUserId();
  const callRef = ref(db, `calls/${conversationId}/${callId}`);

  const snap = await get(callRef);
  if (!snap.exists()) throw new Error('Call no longer available.');
  const callData = snap.val() as CallDoc;

  const constraints: MediaStreamConstraints =
    type === 'video'
      ? { audio: true, video: { width: 640, height: 480 } }
      : { audio: true, video: false };

  const localStream = await navigator.mediaDevices.getUserMedia(constraints);

  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  const remoteStream = new MediaStream();
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
  };

  // Set remote description from offer
  const offer = JSON.parse(callData.offer as string);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  // Create answer
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // Write answer
  await update(callRef, {
    answer: JSON.stringify(answer),
    status: 'accepted',
  });

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const candidateRef = ref(db, `calls/${conversationId}/${callId}/iceCandidates/${calleeId}/${Date.now()}`);
      set(candidateRef, JSON.stringify(event.candidate)).catch(() => {});
    }
  };

  // Listen for caller's ICE candidates
  const iceUnsubscribe = onValue(ref(db, `calls/${conversationId}/${callId}/iceCandidates/${callData.callerId}`), (snap) => {
    if (snap.exists()) {
      const val = snap.val() as Record<string, string>;
      Object.values(val).forEach(async (candidateStr) => {
        try {
          const candidate = JSON.parse(candidateStr);
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore
        }
      });
    }
  });

  // Listen for status changes
  const statusUnsubscribe = onValue(ref(db, `calls/${conversationId}/${callId}/status`), (snap) => {
    const status = snap.val() as CallStatus;
    if (status === 'ended' || status === 'rejected' || status === 'missed') {
      cleanup(callHandle);
    }
  });

  const callHandle: CallHandle = {
    callId,
    conversationId,
    peerConnection: pc,
    localStream,
    remoteStream,
    type,
    isCaller: false,
  };

  (callHandle as { _unsubs?: Array<() => void> })._unsubs = [iceUnsubscribe, statusUnsubscribe];

  return callHandle;
}

// Reject a call
export async function rejectCall(conversationId: string, callId: string): Promise<void> {
  const db = getRtdb();
  await update(ref(db, `calls/${conversationId}/${callId}`), { status: 'rejected' });
}

// End a call
export async function endCall(conversationId: string, callId: string): Promise<void> {
  const db = getRtdb();
  await update(ref(db, `calls/${conversationId}/${callId}`), { status: 'ended' });
}

// Cleanup resources
export function cleanup(callHandle: CallHandle): void {
  try {
    callHandle.localStream.getTracks().forEach((t) => t.stop());
  } catch { /* ignore */ }
  try {
    callHandle.peerConnection.close();
  } catch { /* ignore */ }
  const unsubs = (callHandle as { _unsubs?: Array<() => void> })._unsubs;
  unsubs?.forEach((u) => { try { u(); } catch { /* ignore */ } });
}

// Listen for incoming calls in a conversation
export function onIncomingCall(
  conversationId: string,
  currentUserId: string,
  callback: (callId: string, callData: CallDoc) => void,
): () => void {
  const db = getRtdb();
  const callsRef = ref(db, `calls/${conversationId}`);
  return onValue(callsRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const calls = snapshot.val() as Record<string, CallDoc>;
    for (const [callId, data] of Object.entries(calls)) {
      if (data.calleeId === currentUserId && data.status === 'ringing') {
        callback(callId, data);
        break;
      }
    }
  });
}

// Remove call data after it ends
export async function removeCall(conversationId: string, callId: string): Promise<void> {
  const db = getRtdb();
  await remove(ref(db, `calls/${conversationId}/${callId}`));
}