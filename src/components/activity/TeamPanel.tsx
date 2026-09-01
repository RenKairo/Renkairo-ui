import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Monitor, 
  Radio, 
  Power, 
  Loader2, 
  AlertCircle, 
  Share2,
  Circle
} from 'lucide-react';
import { usePeerScreenShare } from '../../hooks/usePeerScreenShare';

export const TeamPanel: React.FC = () => {
  const {
    startHostSession,
    joinSession,
    endSession,
    isHost,
    isConnected,
    isConnecting,
    peerId,
    participants,
    error
  } = usePeerScreenShare();

  const [inputRoomId, setInputRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
      <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider shrink-0 bg-[var(--bg-panel)]">
        <span>P2P COLLABORATION</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {/* Error Notification Banner */}
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-500 font-mono flex items-start space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Active P2P Session Status Card */}
        {isConnected ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Active Room</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                {isHost ? 'HOST' : 'VIEWER'}
              </span>
            </div>

            <div className="p-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded flex items-center justify-between font-mono text-xs shadow-sm">
              <span className="text-[var(--accent-cyan)] font-bold truncate pr-2">{peerId}</span>
              <button
                onClick={copyRoomId}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Copy Room ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={endSession}
              className="w-full py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 rounded text-xs font-semibold font-mono flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </button>
          </div>
        ) : isConnecting ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 text-center space-y-2 shadow-sm">
            <Loader2 className="w-5 h-5 text-[var(--accent-cyan)] animate-spin mx-auto" />
            <p className="text-xs font-mono text-[var(--accent-cyan)]">Establishing WebRTC P2P link...</p>
          </div>
        ) : (
          /* Start or Join Actions */
          <div className="space-y-3">
            {/* Host Section */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 space-y-2 shadow-sm">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-primary)]">
                <Monitor className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                <span>Host Screen Share</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                Stream your IDE screen & audio directly to peers.
              </p>
              <button
                onClick={() => startHostSession()}
                className="w-full py-1.5 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white font-semibold text-xs rounded transition-all flex items-center justify-center space-x-1.5 font-mono shadow-md cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Start Host Stream</span>
              </button>
            </div>

            {/* Join Section */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 space-y-2 shadow-sm">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-primary)]">
                <Radio className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                <span>Join Peer Room</span>
              </div>
              <input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Enter Room ID..."
                className="w-full h-7 bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] font-mono shadow-sm"
              />
              <button
                onClick={() => joinSession(inputRoomId)}
                disabled={!inputRoomId.trim()}
                className="w-full py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--accent-cyan)] disabled:opacity-50 text-xs font-semibold rounded transition-colors flex items-center justify-center space-x-1.5 font-mono cursor-pointer shadow-sm"
              >
                <span>Connect to Room</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Live Active Participants List */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] font-semibold uppercase px-1 mb-2">
            <span>ACTIVE PARTICIPANTS</span>
            <span className="bg-[var(--bg-card)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">
              {participants.length}
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-center text-xs text-[var(--text-muted)] font-mono">
              No active P2P session.
            </div>
          ) : (
            <div className="space-y-1.5">
              {participants.map((member) => (
                <div key={member.peerId} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 flex items-center justify-between text-xs shadow-sm">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${member.isSelf ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`}></span>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] text-[11px] flex items-center space-x-1">
                        <span>{member.name}</span>
                      </h4>
                      <span className="text-[9px] text-[var(--text-muted)] font-mono">{member.status}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-[var(--accent-cyan)] font-mono bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-color)] font-semibold">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
