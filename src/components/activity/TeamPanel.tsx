import React, { useState } from 'react';
import { Users, Copy, Check, Mic, MicOff, Video, Eye, Share2 } from 'lucide-react';

export const TeamPanel: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const team = [
    { name: 'Developer (You)', role: 'Host', status: 'Editing server.py', color: 'bg-emerald-500' },
    { name: 'Alex Chen', role: 'Collaborator', status: 'Viewing routes.ts', color: 'bg-sky-500' },
    { name: 'Elena Rostova', role: 'Reviewer', status: 'Idle', color: 'bg-purple-500' }
  ];

  const copyRoomLink = () => {
    navigator.clipboard.writeText('https://renkairo.io/live/room-8829-x');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>TEAM COLLABORATION</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Room Share Card */}
        <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span>Live Session Room</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">Active</span>
          </div>

          <button
            onClick={copyRoomLink}
            className="w-full py-1.5 bg-[#181B24] border border-[#232734] hover:border-[#38BDF8]/40 rounded text-xs text-gray-300 flex items-center justify-center space-x-1.5 font-mono transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>

        {/* Audio / Video Call Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`flex-1 py-1.5 rounded border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
              isMicOn ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-[#12151C] text-gray-400 border-[#232734] hover:text-white'
            }`}
          >
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isMicOn ? 'Mute' : 'Unmute'}</span>
          </button>
        </div>

        {/* Active Collaborators List */}
        <div className="text-[10px] font-mono text-gray-400 font-semibold uppercase px-1">
          ACTIVE PARTICIPANTS ({team.length})
        </div>

        <div className="space-y-2">
          {team.map((member) => (
            <div key={member.name} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${member.color}`}></span>
                <div>
                  <h4 className="text-xs font-semibold text-white">{member.name}</h4>
                  <span className="text-[9px] text-gray-400 font-mono">{member.status}</span>
                </div>
              </div>
              <span className="text-[9px] text-gray-500 font-mono">{member.role}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
