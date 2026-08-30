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
    <div className="flex-1 flex flex-col bg-[#0B0D11] border border-[#232734] rounded-xl overflow-hidden font-sans select-none shadow-2xl">
      {/* Header Bar */}
      <div className="h-10 bg-[#12151C] border-b border-[#232734] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Share2 className="w-4 h-4 text-[#38BDF8]" />
          <span className="text-xs font-bold text-white tracking-wider uppercase">P2P Screen Sharing</span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {isHost ? 'HOSTING LIVE STREAM' : 'CONNECTED (VIEWING)'}
              </span>
            </div>
          ) : isConnecting ? (
            <div className="flex items-center space-x-1.5 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 text-[#38BDF8] animate-spin" />
              <span className="text-[10px] font-mono text-[#38BDF8]">CONNECTING...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-gray-500/10 border border-gray-500/30 px-2 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              <span className="text-[10px] font-mono text-gray-400">DISCONNECTED</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
        {/* Error Alert Banner */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-xs text-rose-300 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Session Setup Controls (When not connected) */}
        {!isConnected && !isConnecting && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Host Session Card */}
            <div className="bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-xl p-5 flex flex-col justify-between transition-all space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-[#38BDF8]" />
                </div>
                <h3 className="text-sm font-bold text-white">Start Host Session</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Share your screen and system audio directly with team members over WebRTC.
                </p>
              </div>

              <button
                onClick={() => startHostSession()}
                className="w-full py-2.5 bg-[#FF4D4D] hover:bg-[#FF6666] text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-2 font-mono shadow-lg shadow-[#FF4D4D]/20 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Share Screen</span>
              </button>
            </div>

            {/* Join Session Card */}
            <div className="bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-xl p-5 flex flex-col justify-between transition-all space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Join Room ID</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Enter a host's Room ID to view their live stream in high resolution.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Enter Room ID (e.g. renkairo-x89a)"
                  className="w-full h-9 bg-[#0B0D11] border border-[#232734] rounded-lg px-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#38BDF8] font-mono"
                />
                <button
                  onClick={() => joinSession(inputRoomId)}
                  disabled={!inputRoomId.trim()}
                  className="w-full py-2 bg-[#181B24] hover:bg-[#232734] border border-[#232734] text-[#38BDF8] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-2 font-mono cursor-pointer"
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
            <div className="bg-[#12151C] border border-[#232734] rounded-lg px-4 py-2.5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-3">
                <span className="text-gray-400">ROOM ID:</span>
                <span className="text-[#38BDF8] font-bold tracking-wider select-all">{peerId}</span>
                <button
                  onClick={copyRoomId}
                  className="px-2 py-1 bg-[#181B24] border border-[#232734] hover:border-[#38BDF8]/40 rounded text-gray-300 hover:text-white flex items-center space-x-1 transition-colors"
                  title="Copy Room ID"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePiP}
                  className="p-1.5 bg-[#181B24] border border-[#232734] hover:border-[#38BDF8]/40 text-gray-300 hover:text-white rounded transition-colors"
                  title="Toggle Picture-in-Picture"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-[#181B24] border border-[#232734] hover:border-[#38BDF8]/40 text-gray-300 hover:text-white rounded transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>

                {!isHost && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 bg-[#181B24] border border-[#232734] hover:border-[#38BDF8]/40 text-gray-300 hover:text-white rounded transition-colors"
                    title={isMuted ? "Unmute Audio" : "Mute Audio"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                )}

                <button
                  onClick={endSession}
                  className="px-3 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 rounded font-semibold text-xs flex items-center space-x-1.5 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div
              ref={videoContainerRef}
              className="flex-1 min-h-[360px] bg-black border border-[#232734] rounded-xl overflow-hidden relative group flex items-center justify-center"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isHost || isMuted}
                className="w-full h-full object-contain"
              />

              {/* Watermark Overlay Badge */}
              <div className="absolute top-3 left-3 bg-[#0B0D11]/80 backdrop-blur border border-[#232734] px-2.5 py-1 rounded text-[10px] font-mono text-gray-300 flex items-center space-x-1.5 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{isHost ? 'Local Screen Share' : 'Remote Peer Screen'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
