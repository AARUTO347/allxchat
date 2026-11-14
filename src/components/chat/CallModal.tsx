import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Modal } from '../ui/Primitives';
import type { CallHandle, CallType } from '../../lib/calls';

interface CallModalProps {
  open: boolean;
  callHandle: CallHandle | null;
  remoteName: string;
  onEnd: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  isIncoming?: boolean;
  callType?: CallType;
}

export function CallModal({
  open,
  callHandle,
  remoteName,
  onEnd,
  onAccept,
  onReject,
  isIncoming = false,
  callType = 'voice',
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!callHandle) return;
    const setupStreams = () => {
      if (localVideoRef.current && callHandle.localStream) {
        localVideoRef.current.srcObject = callHandle.localStream;
      }
      if (remoteVideoRef.current && callHandle.remoteStream) {
        remoteVideoRef.current.srcObject = callHandle.remoteStream;
      }
    };
    setupStreams();
    // Also listen for new tracks
    const interval = setInterval(setupStreams, 500);
    return () => clearInterval(interval);
  }, [callHandle]);

  useEffect(() => {
    if (!open || isIncoming) return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [open, isIncoming]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (!callHandle) return;
    callHandle.localStream.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted(!muted);
  };

  const toggleVideo = () => {
    if (!callHandle) return;
    callHandle.localStream.getVideoTracks().forEach((t) => {
      t.enabled = videoOff;
    });
    setVideoOff(!videoOff);
  };

  if (isIncoming) {
    return (
      <Modal open={open} onClose={() => onReject?.()} title={`Incoming ${callType} call`} size="sm">
        <div className="flex flex-col items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
            {callType === 'video' ? <Video size={32} /> : <Phone size={32} />}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">{remoteName}</p>
            <p className="text-sm text-[#667781] dark:text-[#8696a0]">
              Incoming {callType} call…
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onReject?.()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
              aria-label="Reject call"
            >
              <PhoneOff size={24} />
            </button>
            <button
              type="button"
              onClick={() => onAccept?.()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600"
              aria-label="Accept call"
            >
              <Phone size={24} />
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onEnd} title={`${callType === 'video' ? 'Video' : 'Voice'} call`} size="lg">
      <div className="flex flex-col gap-4 p-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#111b21]">
          {callType === 'video' ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 h-24 w-32 rounded-xl border-2 border-white/20 object-cover shadow-lg"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Phone size={40} />
                </div>
                <p className="text-lg font-semibold text-white">{remoteName}</p>
                <p className="text-sm text-white/70">{formatDuration(duration)}</p>
              </div>
            </div>
          )}
        </div>

        {callType === 'video' && (
          <div className="text-center text-sm text-[#667781] dark:text-[#8696a0]">
            {formatDuration(duration)}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              muted ? 'bg-red-500 text-white' : 'bg-[#f0f2f5] text-[#111b21] dark:bg-[#2a3942] dark:text-[#e9edef]'
            }`}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          {callType === 'video' && (
            <button
              type="button"
              onClick={toggleVideo}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                videoOff ? 'bg-red-500 text-white' : 'bg-[#f0f2f5] text-[#111b21] dark:bg-[#2a3942] dark:text-[#e9edef]'
              }`}
              aria-label={videoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}
          <button
            type="button"
            onClick={onEnd}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
            aria-label="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </Modal>
  );
}