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
    <aside className="w-64 bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider shrink-0">
        <span>P2P COLLABORATION</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {/* Error Notification Banner */}
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-300 font-mono flex items-start space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Active P2P Session Status Card */}
        {isConnected ? (
          <div className="bg-[#12151C] border border-[#232734] rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Active Room</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                {isHost ? 'HOST' : 'VIEWER'}
              </span>
            </div>

            <div className="p-2 bg-[#0B0D11] border border-[#232734] rounded flex items-center justify-between font-mono text-xs">
              <span className="text-[#38BDF8] font-bold truncate pr-2">{peerId}</span>
              <button
                onClick={copyRoomId}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Copy Room ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={endSession}
              className="w-full py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 rounded text-xs font-semibold font-mono flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </button>
          </div>
        ) : isConnecting ? (
          <div className="bg-[#12151C] border border-[#232734] rounded-lg p-4 text-center space-y-2">
            <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin mx-auto" />
            <p className="text-xs font-mono text-[#38BDF8]">Establishing WebRTC P2P link...</p>
          </div>
        ) : (
          /* Start or Join Actions */
          <div className="space-y-3">
            {/* Host Section */}
            <div className="bg-[#12151C] border border-[#232734] rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Monitor className="w-3.5 h-3.5 text-[#FF4D4D]" />
                <span>Host Screen Share</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Stream your IDE screen & audio directly to peers.
              </p>
              <button
                onClick={() => startHostSession()}
                className="w-full py-1.5 bg-[#FF4D4D] hover:bg-[#FF6666] text-white font-semibold text-xs rounded transition-all flex items-center justify-center space-x-1.5 font-mono shadow-md cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Start Host Stream</span>
              </button>
            </div>

            {/* Join Section */}
            <div className="bg-[#12151C] border border-[#232734] rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                <Radio className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Join Peer Room</span>
              </div>
              <input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Enter Room ID..."
                className="w-full h-7 bg-[#0B0D11] border border-[#232734] rounded px-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#38BDF8] font-mono"
              />
              <button
                onClick={() => joinSession(inputRoomId)}
                disabled={!inputRoomId.trim()}
                className="w-full py-1.5 bg-[#181B24] hover:bg-[#232734] border border-[#232734] text-[#38BDF8] disabled:opacity-50 text-xs font-semibold rounded transition-colors flex items-center justify-center space-x-1.5 font-mono cursor-pointer"
              >
                <span>Connect to Room</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Live Active Participants List */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 font-semibold uppercase px-1 mb-2">
            <span>ACTIVE PARTICIPANTS</span>
            <span className="bg-[#181B24] border border-[#232734] px-1.5 py-0.5 rounded text-gray-300">
              {participants.length}
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="p-3 bg-[#12151C] border border-[#232734] rounded-lg text-center text-xs text-gray-500 font-mono">
              No active P2P session.
            </div>
          ) : (
            <div className="space-y-1.5">
              {participants.map((member) => (
                <div key={member.peerId} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${member.isSelf ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`}></span>
                    <div>
                      <h4 className="font-semibold text-white text-[11px] flex items-center space-x-1">
                        <span>{member.name}</span>
                      </h4>
                      <span className="text-[9px] text-gray-400 font-mono">{member.status}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-[#38BDF8] font-mono bg-[#181B24] px-1.5 py-0.5 rounded border border-[#232734]">
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
