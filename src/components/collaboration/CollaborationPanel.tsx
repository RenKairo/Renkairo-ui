import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, 
  Share2, 
  Copy, 
  Check, 
  Maximize, 
  Minimize, 
  Power, 
  Loader2, 
  Tv, 
  Users, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  PictureInPicture2,
  Radio
} from 'lucide-react';
import { usePeerScreenShare } from '../../hooks/usePeerScreenShare';

export const CollaborationPanel: React.FC = () => {
  const {
    startHostSession,
    joinSession,
    endSession,
    isHost,
    isConnected,
    isConnecting,
    peerId,
    localStream,
    remoteStream,
    error
  } = usePeerScreenShare();

  const [inputRoomId, setInputRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Bind media stream to video element
  const activeStream = isHost ? localStream : remoteStream;

  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch((err) => console.warn('[Video Play Error]:', err));
    }
  }, [activeStream]);

  // Copy Room ID to clipboard
  const copyRoomId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Toggle Fullscreen on Video Container
  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('[Fullscreen Error]:', err);
    }
  };

  // Listen for native escape key / exit fullscreen
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Toggle Picture-in-Picture (PiP) Mode
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (err) {
      console.warn('[PiP Error]:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl overflow-hidden font-sans select-none shadow-2xl transition-colors duration-150">
      {/* Header Bar */}
      <div className="h-10 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Share2 className="w-4 h-4 text-[var(--accent-cyan)]" />
          <span className="text-xs font-bold text-[var(--text-primary)] tracking-wider uppercase">P2P Screen Sharing</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                {isHost ? 'HOSTING LIVE STREAM' : 'CONNECTED (VIEWING)'}
              </span>
            </div>
          ) : isConnecting ? (
            <div className="flex items-center space-x-1.5 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 text-[var(--accent-cyan)] animate-spin" />
              <span className="text-[10px] font-mono text-[var(--accent-cyan)] font-bold">CONNECTING...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] px-2 py-0.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]"></span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">DISCONNECTED</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
        {/* Error Alert Banner */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-xs text-rose-500 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Session Setup Controls (When not connected) */}
        {!isConnected && !isConnecting && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Host Session Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 rounded-xl p-5 flex flex-col justify-between transition-all space-y-4 shadow-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-[var(--accent-cyan)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Start Host Session</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Share your screen and system audio directly with team members over WebRTC.
                </p>
              </div>

              <button
                onClick={() => startHostSession()}
                className="w-full py-2.5 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-2 font-mono shadow-md cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Share Screen</span>
              </button>
            </div>

            {/* Join Session Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 rounded-xl p-5 flex flex-col justify-between transition-all space-y-4 shadow-sm">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Join Room ID</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Enter a host's Room ID to view their live stream in high resolution.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Enter Room ID (e.g. renkairo-x89a)"
                  className="w-full h-9 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] font-mono shadow-sm"
                />
                <button
                  onClick={() => joinSession(inputRoomId)}
                  disabled={!inputRoomId.trim()}
                  className="w-full py-2 bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--accent-cyan)] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-2 font-mono cursor-pointer shadow-sm"
                >
                  <Radio className="w-4 h-4" />
                  <span>Connect to Stream</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Stream Stage View */}
        {isConnected && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Session Info Header Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 flex items-center justify-between text-xs font-mono shadow-sm">
              <div className="flex items-center space-x-3">
                <span className="text-[var(--text-muted)]">ROOM ID:</span>
                <span className="text-[var(--accent-cyan)] font-bold tracking-wider select-all">{peerId}</span>
                <button
                  onClick={copyRoomId}
                  className="px-2 py-1 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-1 transition-colors shadow-sm"
                  title="Copy Room ID"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-[var(--text-muted)]" />}
                  <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePiP}
                  className="p-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors shadow-sm"
                  title="Toggle Picture-in-Picture"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors shadow-sm"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>

                {!isHost && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors shadow-sm"
                    title={isMuted ? "Unmute Audio" : "Mute Audio"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                )}

                <button
                  onClick={endSession}
                  className="px-3 py-1 bg-rose-500/15 border border-rose-500/40 text-rose-500 hover:bg-rose-500/25 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div
              ref={videoContainerRef}
              className="flex-1 min-h-[360px] bg-black border border-[var(--border-color)] rounded-xl overflow-hidden relative group flex items-center justify-center shadow-lg"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isHost || isMuted}
                className="w-full h-full object-contain"
              />

              {/* Watermark Overlay Badge */}
              <div className="absolute top-3 left-3 bg-[var(--bg-panel)]/90 backdrop-blur border border-[var(--border-color)] px-2.5 py-1 rounded text-[10px] font-mono text-[var(--text-primary)] flex items-center space-x-1.5 pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{isHost ? 'Local Screen Share' : 'Remote Peer Screen'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
