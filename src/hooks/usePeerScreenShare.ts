import { useState, useRef, useCallback, useEffect } from 'react';
import { Peer, MediaConnection, DataConnection } from 'peerjs';

export interface Participant {
  peerId: string;
  name: string;
  role: 'Host' | 'Viewer';
  status: 'Broadcasting' | 'Viewing Stream' | 'Connecting...' | 'Disconnected';
  isSelf: boolean;
}

export interface ScreenShareState {
  isHost: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  peerId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participants: Participant[];
  error: string | null;
}

export interface UsePeerScreenShareReturn extends ScreenShareState {
  startHostSession: () => Promise<string>;
  joinSession: (roomId: string) => Promise<void>;
  endSession: () => void;
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

const INITIAL_STATE: ScreenShareState = {
  isHost: false,
  isConnected: false,
  isConnecting: false,
  peerId: null,
  localStream: null,
  remoteStream: null,
  participants: [],
  error: null
};

export function usePeerScreenShare(): UsePeerScreenShareReturn {
  // Single consolidated state object to ensure deterministic React hook ordering across HMR
  const [state, setState] = useState<ScreenShareState>(INITIAL_STATE);

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

    // 5. Reset React state
    setState(INITIAL_STATE);
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
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

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
          setState({
            isHost: true,
            isConnected: true,
            isConnecting: false,
            peerId: id,
            localStream: stream,
            remoteStream: null,
            participants: [
              {
                peerId: id,
                name: 'You (Host)',
                role: 'Host',
                status: 'Broadcasting',
                isSelf: true
              }
            ],
            error: null
          });

          resolve(id);
        });

        // Automatic signaling server reconnection handler
        peer.on('disconnected', () => {
          console.warn('[PeerJS Host]: Disconnected from signaling server. Reconnecting...');
          try {
            if (!peer.destroyed) peer.reconnect();
          } catch (e) {}
        });

        // Listen for incoming viewer data connections
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

          // Dynamically update participants list
          setState((prev) => {
            if (prev.participants.some((p) => p.peerId === call.peer)) return prev;
            return {
              ...prev,
              participants: [
                ...prev.participants,
                {
                  peerId: call.peer,
                  name: `Peer (${call.peer.slice(-4)})`,
                  role: 'Viewer',
                  status: 'Viewing Stream',
                  isSelf: false
                }
              ]
            };
          });

          // Handle ICE connection state changes for Host side
          if (call.peerConnection) {
            call.peerConnection.oniceconnectionstatechange = () => {
              const stateName = call.peerConnection?.iceConnectionState;
              if (stateName === 'failed' || stateName === 'closed') {
                activeCallsRef.current = activeCallsRef.current.filter((c) => c !== call);
                setState((prev) => ({
                  ...prev,
                  participants: prev.participants.filter((p) => p.peerId !== call.peer)
                }));
              }
            };
          }

          call.on('close', () => {
            activeCallsRef.current = activeCallsRef.current.filter((c) => c !== call);
            setState((prev) => ({
              ...prev,
              participants: prev.participants.filter((p) => p.peerId !== call.peer)
            }));
          });

          call.on('error', (err) => {
            console.warn('[PeerJS Host Call Error]:', err);
            setState((prev) => ({
              ...prev,
              participants: prev.participants.filter((p) => p.peerId !== call.peer)
            }));
          });
        });

        peer.on('error', (err) => {
          console.error('[PeerJS Host Error]:', err);
          if (err.type === 'disconnected') {
            try { peer.reconnect(); } catch (e) {}
            return;
          }
          const errMessage = err.type === 'unavailable-id' 
            ? 'Room ID is already occupied. Retrying...' 
            : `P2P Connection Error: ${err.message}`;
          setState((prev) => ({ ...prev, isConnecting: false, error: errMessage }));
          reject(new Error(errMessage));
        });
      });
    } catch (err: any) {
      console.error('[Host Screen Capture Error]:', err);
      const errMsg = err.name === 'NotAllowedError' 
        ? 'Screen capture permission was denied.' 
        : err.message || 'Failed to start screen share session.';
      setState((prev) => ({ ...prev, isConnecting: false, error: errMsg }));
      endSession();
      throw new Error(errMsg);
    }
  }, [endSession]);

  // Viewer Mode: Connects to an existing Host Room ID
  const joinSession = useCallback(async (targetRoomId: string): Promise<void> => {
    const cleanRoomId = targetRoomId.trim();
    if (!cleanRoomId) {
      setState((prev) => ({ ...prev, error: 'Please enter a valid Room ID.' }));
      return;
    }

    endSession();
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

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
          setState({
            isHost: false,
            isConnected: false,
            isConnecting: true,
            peerId: myPeerId,
            localStream: null,
            remoteStream: null,
            participants: [
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
            ],
            error: null
          });

          // Automatic signaling server reconnection handler
          peer.on('disconnected', () => {
            console.warn('[PeerJS Viewer]: Disconnected from signaling server. Reconnecting...');
            try {
              if (!peer.destroyed) peer.reconnect();
            } catch (e) {}
          });

          // 2. Open Data Channel for P2P heartbeat
          const dataConn = peer.connect(cleanRoomId);
          dataConnectionsRef.current.push(dataConn);

          // 3. Initiate Media Call with a lightweight dummy stream
          const dummyStream = createDummyStream();
          const call = peer.call(cleanRoomId, dummyStream);
          activeCallsRef.current.push(call);

          call.on('stream', (remoteMediaStream) => {
            if (disconnectTimerRef.current) {
              clearTimeout(disconnectTimerRef.current);
              disconnectTimerRef.current = null;
            }

            setState({
              isHost: false,
              isConnected: true,
              isConnecting: false,
              peerId: myPeerId,
              localStream: null,
              remoteStream: remoteMediaStream,
              participants: [
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
              ],
              error: null
            });

            resolve();
          });

          // 4. Robust ICE Connection State Monitor (with 5s grace period for transient 'disconnected' states)
          if (call.peerConnection) {
            call.peerConnection.oniceconnectionstatechange = () => {
              const stateName = call.peerConnection?.iceConnectionState;
              console.log('[WebRTC ICE Connection State]:', stateName);

              if (stateName === 'connected' || stateName === 'completed') {
                if (disconnectTimerRef.current) {
                  clearTimeout(disconnectTimerRef.current);
                  disconnectTimerRef.current = null;
                }
                setState((prev) => ({ ...prev, isConnected: true }));
              } else if (stateName === 'disconnected') {
                if (!disconnectTimerRef.current) {
                  disconnectTimerRef.current = setTimeout(() => {
                    setState({
                      ...INITIAL_STATE,
                      error: 'P2P connection dropped or host went offline.'
                    });
                  }, 5000);
                }
              } else if (stateName === 'failed' || stateName === 'closed') {
                if (disconnectTimerRef.current) {
                  clearTimeout(disconnectTimerRef.current);
                  disconnectTimerRef.current = null;
                }
                setState({
                  ...INITIAL_STATE,
                  error: 'P2P WebRTC connection failed.'
                });
              }
            };
          }

          call.on('close', () => {
            setState({
              ...INITIAL_STATE,
              error: 'Screen share session ended by host.'
            });
          });

          call.on('error', (err) => {
            console.error('[PeerJS Viewer Call Error]:', err);
            setState({
              ...INITIAL_STATE,
              error: `Failed connecting to room: ${err.message}`
            });
            reject(err);
          });
        });

        peer.on('error', (err) => {
          console.error('[PeerJS Viewer Error]:', err);
          if (err.type === 'disconnected') {
            try { peer.reconnect(); } catch (e) {}
            return;
          }
          let errMsg = `Failed to join session: ${err.message}`;
          if (err.type === 'peer-unavailable') {
            errMsg = `Room ID "${cleanRoomId}" not found or host went offline.`;
          }
          setState({ ...INITIAL_STATE, error: errMsg });
          reject(new Error(errMsg));
        });
      });
    } catch (err: any) {
      console.error('[Join Session Error]:', err);
      const msg = err.message || 'Failed to join screen share session.';
      setState({ ...INITIAL_STATE, error: msg });
      endSession();
      throw new Error(msg);
    }
  }, [endSession]);

  return {
    ...state,
    startHostSession,
    joinSession,
    endSession
  };
}
