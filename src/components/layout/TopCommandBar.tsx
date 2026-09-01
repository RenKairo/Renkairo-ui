import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Moon, 
  Activity, 
  ChevronDown, 
  FolderOpen,
  FolderSync,
  User,
  Check
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';

export const TopCommandBar: React.FC = () => {
  const { 
    setCommandPaletteOpen, 
    metrics, 
    rootName, 
    workspacePath,
    openFolder,
    changeScopeFolder
  } = useIDEStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="h-11 bg-[#0B0D11] border-b border-[#232734] px-3 flex items-center justify-between text-xs select-none z-30 relative">
      {/* Left: Brand Logo & Workspace Switcher */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button 
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#181B24] transition-colors focus:outline-none"
          >
            {/* Japanese Torii Emblem */}
            <div className="w-5 h-5 rounded bg-[#12151C] border border-[#232734] flex items-center justify-center relative overflow-hidden group p-0.5">
              <div className="absolute inset-0 bg-gradient-to-t from-[#FF4D4D]/20 to-transparent opacity-60"></div>
              <ToriiIcon className="w-3.5 h-3.5 z-10 drop-shadow-[0_0_6px_rgba(255,77,77,0.6)] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-semibold text-gray-200 tracking-wide font-mono">
              {rootName ? rootName : 'RenKairo IDE'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Workspace Dropdown */}
          {isProjectDropdownOpen && (
            <div 
              className="absolute left-0 top-9 w-72 bg-[#12151C] border border-[#232734] rounded-lg shadow-2xl py-1 z-50 text-gray-300"
              onMouseLeave={() => setIsProjectDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase flex items-center justify-between">
                <span>Active Scope</span>
              </div>

              {workspacePath ? (
                <div className="px-3 py-2 text-xs bg-[#181B24]/80 flex items-center space-x-2 border-y border-[#232734]/50">
                  <FolderOpen className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <div className="overflow-hidden flex-1">
                    <p className="font-mono text-white truncate font-medium">{rootName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{workspacePath}</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-gray-500 font-mono">
                  No folder opened
                </div>
              )}

              {/* Action: Open / Change Folder */}
              <div className="p-1">
                <button 
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    workspacePath ? changeScopeFolder() : openFolder();
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#181B24] text-[#38BDF8] hover:text-white rounded flex items-center space-x-2 transition-colors font-medium"
                >
                  <FolderSync className="w-4 h-4" />
                  <span>{workspacePath ? 'Change Folder Scope...' : 'Open Folder From Machine...'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Command Palette Trigger Input */}
      <div className="flex-1 max-w-xl mx-4">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full h-7 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-md px-3 flex items-center justify-between text-gray-400 hover:text-gray-200 transition-all text-xs focus:outline-none"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate">Search commands, files, actions...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-[#181B24] border border-[#232734] px-1.5 py-0.5 rounded text-gray-400 font-mono">
            <span>Ctrl</span>+<span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center space-x-3 text-gray-400">
        <div className="flex items-center space-x-1.5 bg-[#12151C] border border-[#232734] px-2 py-0.5 rounded-full">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse-subtle" />
          <span className="text-[10px] font-mono text-emerald-400">{metrics?.cpu.usage || 18}% CPU</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 hover:bg-[#181B24] rounded-md hover:text-white transition-colors relative focus:outline-none"
          >
            <Bell className="w-4 h-4" />
          </button>

          {isNotifOpen && (
            <div 
              className="absolute right-0 top-9 w-72 bg-[#12151C] border border-[#232734] rounded-lg shadow-2xl p-3 z-50 text-gray-300"
              onMouseLeave={() => setIsNotifOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#232734] mb-2">
                <span className="font-semibold text-white">System Status</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="bg-[#181B24] p-2 rounded border border-[#232734] flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded bg-[#12151C] border border-[#232734] flex items-center justify-center shrink-0 p-0.5">
                    <ToriiIcon className="w-4 h-4 drop-shadow-[0_0_4px_rgba(255,77,77,0.5)]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">RenKairo Core</p>
                    <p className="text-[10px] text-gray-400">{workspacePath ? `Active: ${rootName}` : 'Ready to open folder'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button 
          title="Theme: East-Asian Cyber Dark" 
          className="p-1.5 hover:bg-[#181B24] rounded-md hover:text-white transition-colors text-amber-400 focus:outline-none"
        >
          <Moon className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#232734]">
          <div className="w-6 h-6 rounded-full bg-[#181B24] border border-[#FF4D4D]/50 flex items-center justify-center overflow-hidden">
            <User className="w-3.5 h-3.5 text-[#FF4D4D]" />
          </div>
        </div>
      </div>
    </header>
  );
};
