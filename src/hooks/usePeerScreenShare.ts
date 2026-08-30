import { useState, useRef, useCallback, useEffect } from 'react';
import { Peer, MediaConnection, DataConnection } from 'peerjs';

export interface Participant {
  peerId: string;
  name: string;
  role: 'Host' | 'Viewer';
  status: 'Broadcasting' | 'Viewing Stream' | 'Connecting...' | 'Disconnected';
  isSelf: boolean;
}

export interface UsePeerScreenShareReturn {
  startHostSession: () => Promise<string>;
  joinSession: (roomId: string) => Promise<void>;
  endSession: () => void;
  isHost: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  peerId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participants: Participant[];
  error: string | null;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

// Helper: Create a lightweight dummy canvas stream for receive-only WebRTC calls
function createDummyStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0B0D11';
    ctx.fillRect(0, 0, 16, 16);
  }
  return canvas.captureStream(1);
}

export function usePeerScreenShare(): UsePeerScreenShareReturn {
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const activeCallsRef = useRef<MediaConnection[]>([]);
  const dataConnectionsRef = useRef<DataConnection[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Teardown / Reset all connections & streams
  const endSession = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    // 1. Stop all local screen capture tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }

    // 2. Close active PeerJS media calls
    activeCallsRef.current.forEach((call) => {
      try { call.close(); } catch (e) {}
    });
    activeCallsRef.current = [];

    // 3. Close data connections
    dataConnectionsRef.current.forEach((conn) => {
      try { conn.close(); } catch (e) {}
    });
    dataConnectionsRef.current = [];

    // 4. Destroy Peer instance
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch (e) {}
      peerRef.current = null;
    }

    // 5. Reset React states
    setIsHost(false);
    setIsConnected(false);
    setIsConnecting(false);
    setPeerId(null);
    setLocalStream(null);
    setRemoteStream(null);
    setParticipants([]);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  // Host Mode: Captures screen and listens for viewer calls & data links
  const startHostSession = useCallback(async (): Promise<string> => {
    endSession();
    setError(null);
    setIsConnecting(true);

    try {
      // 1. Capture screen & audio (Electron Desktop Capturer + Web Browser Fallback)
      let stream: MediaStream | null = null;

      if (typeof window !== 'undefined' && window.electronAPI?.getDesktopSources) {
        try {
          const sources = await window.electronAPI.getDesktopSources();
          if (sources && sources.length > 0) {
            const primarySource = sources[0];
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: primarySource.id,
                  minWidth: 1280,
                  maxWidth: 1920,
                  minHeight: 720,
                  maxHeight: 1080
                }
              } as any
            });
          }
        } catch (electronErr) {
          console.warn('[Electron Desktop Capture Fallback to getDisplayMedia]:', electronErr);
        }
      }

      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30, max: 60 } },
            audio: true
          });
        } catch (audioErr: any) {
          console.warn('[Screen Capture Audio Fallback]: Audio capture not supported, capturing video-only.', audioErr);
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30, max: 60 } }
          });
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Listen for browser "Stop Sharing" floating bar event
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          endSession();
        };
      });

      // Generate a short 6-character room ID
      const roomId = `renkairo-${Math.random().toString(36).substring(2, 8)}`;

      // 2. Initialize Peer instance with short Room ID
      const peer = new Peer(roomId, {
        config: {
          iceServers: DEFAULT_ICE_SERVERS
        }
      });

      peerRef.current = peer;

      return new Promise<string>((resolve, reject) => {
        peer.on('open', (id) => {
          setPeerId(id);
          setIsHost(true);
          setIsConnected(true);
          setIsConnecting(false);

          setParticipants([
            {
              peerId: id,
              name: 'You (Host)',
              role: 'Host',
              status: 'Broadcasting',
              isSelf: true
            }
          ]);

          resolve(id);
        });

        // Listen for incoming viewer data connections (for heartbeat & status)
        peer.on('connection', (conn) => {
          dataConnectionsRef.current.push(conn);

          conn.on('open', () => {
            conn.send({ type: 'welcome', hostId: roomId });
          });

          conn.on('close', () => {
            dataConnectionsRef.current = dataConnectionsRef.current.filter((c) => c !== conn);
          });
        });

        // Listen for incoming viewer media calls
        peer.on('call', (call) => {
          activeCallsRef.current.push(call);

          // Answer incoming viewer with local screen stream
          call.answer(stream!);

          // Dynamically add joining viewer to participants list
          setParticipants((prev) => {
            if (prev.some((p) => p.peerId === call.peer)) return prev;
            return [
              ...prev,
              {
                peerId: call.peer,
                name: `Peer (${call.peer.slice(-4)})`,
                role: 'Viewer',
                status: 'Viewing Stream',
                isSelf: false
              }
            ];
          });

          // Handle ICE connection state changes for Host side
          if (call.peerConnection) {
            call.peerConnection.oniceconnectionstatechange = () => {
              const state = call.peerConnection?.iceConnectionState;
              if (state === 'failed' || state === 'closed') {
                activeCallsRef.current = activeCallsRef.current.filter((c) => c !== call);
                setParticipants((prev) => prev.filter((p) => p.peerId !== call.peer));
              }
            };
          }

          call.on('close', () => {
            activeCallsRef.current = activeCallsRef.current.filter((c) => c !== call);
            setParticipants((prev) => prev.filter((p) => p.peerId !== call.peer));
          });

          call.on('error', (err) => {
            console.warn('[PeerJS Host Call Error]:', err);
            setParticipants((prev) => prev.filter((p) => p.peerId !== call.peer));
          });
        });

        peer.on('error', (err) => {
          console.error('[PeerJS Host Error]:', err);
          const errMessage = err.type === 'unavailable-id' 
            ? 'Room ID is already occupied. Retrying...' 
            : `P2P Connection Error: ${err.message}`;
          setError(errMessage);
          setIsConnecting(false);
          reject(new Error(errMessage));
        });
      });
    } catch (err: any) {
      console.error('[Host Screen Capture Error]:', err);
      const errMsg = err.name === 'NotAllowedError' 
        ? 'Screen capture permission was denied.' 
        : err.message || 'Failed to start screen share session.';
      setError(errMsg);
      setIsConnecting(false);
      endSession();
      throw new Error(errMsg);
    }
  }, [endSession]);

  // Viewer Mode: Connects to an existing Host Room ID
  const joinSession = useCallback(async (targetRoomId: string): Promise<void> => {
    const cleanRoomId = targetRoomId.trim();
    if (!cleanRoomId) {
      setError('Please enter a valid Room ID.');
      return;
    }

    endSession();
    setError(null);
    setIsConnecting(true);

    try {
      // 1. Initialize PeerJS client with random ID
      const peer = new Peer({
        config: {
          iceServers: DEFAULT_ICE_SERVERS
        }
      });

      peerRef.current = peer;

      return new Promise<void>((resolve, reject) => {
        peer.on('open', (myPeerId) => {
          setPeerId(myPeerId);
          setIsHost(false);

          setParticipants([
            {
              peerId: cleanRoomId,
              name: `Host (${cleanRoomId.slice(-6)})`,
              role: 'Host',
              status: 'Broadcasting',
              isSelf: false
            },
            {
              peerId: myPeerId,
              name: 'You (Viewer)',
              role: 'Viewer',
              status: 'Connecting...',
              isSelf: true
            }
          ]);

          // 2. Open Data Channel for P2P heartbeat
          const dataConn = peer.connect(cleanRoomId);
          dataConnectionsRef.current.push(dataConn);

          // 3. Initiate Media Call with a lightweight dummy stream to ensure SDP m-lines format cleanly
          const dummyStream = createDummyStream();
          const call = peer.call(cleanRoomId, dummyStream);
          activeCallsRef.current.push(call);

          call.on('stream', (remoteMediaStream) => {
            if (disconnectTimerRef.current) {
              clearTimeout(disconnectTimerRef.current);
              disconnectTimerRef.current = null;
            }

            setRemoteStream(remoteMediaStream);
            setIsConnected(true);
            setIsConnecting(false);

            setParticipants([
              {
                peerId: cleanRoomId,
                name: `Host (${cleanRoomId.slice(-6)})`,
                role: 'Host',
                status: 'Broadcasting',
                isSelf: false
              },
              {
                peerId: myPeerId,
                name: 'You (Viewer)',
                role: 'Viewer',
                status: 'Viewing Stream',
                isSelf: true
              }
            ]);

            resolve();
          });

          // 4. Robust ICE Connection State Monitor (with 5s grace period for transient 'disconnected' states)
          if (call.peerConnection) {
            call.peerConnection.oniceconnectionstatechange = () => {
              const state = call.peerConnection?.iceConnectionState;
              console.log('[WebRTC ICE Connection State]:', state);

              if (state === 'connected' || state === 'completed') {
                if (disconnectTimerRef.current) {
                  clearTimeout(disconnectTimerRef.current);
                  disconnectTimerRef.current = null;
                }
                setIsConnected(true);
              } else if (state === 'disconnected') {
                // Give a 5-second grace period before dropping connection
                if (!disconnectTimerRef.current) {
                  disconnectTimerRef.current = setTimeout(() => {
                    setError('P2P connection dropped or host went offline.');
                    setIsConnected(false);
                    setParticipants([]);
                  }, 5000);
                }
              } else if (state === 'failed' || state === 'closed') {
                if (disconnectTimerRef.current) {
                  clearTimeout(disconnectTimerRef.current);
                  disconnectTimerRef.current = null;
                }
                setError('P2P WebRTC connection failed.');
                setIsConnected(false);
                setParticipants([]);
              }
            };
          }

          call.on('close', () => {
            setIsConnected(false);
            setRemoteStream(null);
            setParticipants([]);
            setError('Screen share session ended by host.');
          });

          call.on('error', (err) => {
            console.error('[PeerJS Viewer Call Error]:', err);
            setError(`Failed connecting to room: ${err.message}`);
            setIsConnecting(false);
            setParticipants([]);
            reject(err);
          });
        });

        peer.on('error', (err) => {
          console.error('[PeerJS Viewer Error]:', err);
          let errMsg = `Failed to join session: ${err.message}`;
          if (err.type === 'peer-unavailable') {
            errMsg = `Room ID "${cleanRoomId}" not found or host went offline.`;
          }
          setError(errMsg);
          setIsConnecting(false);
          setParticipants([]);
          reject(new Error(errMsg));
        });
      });
    } catch (err: any) {
      console.error('[Join Session Error]:', err);
      const msg = err.message || 'Failed to join screen share session.';
      setError(msg);
      setIsConnecting(false);
      endSession();
      throw new Error(msg);
    }
  }, [endSession]);

  return {
    startHostSession,
    joinSession,
    endSession,
    isHost,
    isConnected,
    isConnecting,
    peerId,
    localStream,
    remoteStream,
    participants,
    error
  };
}
