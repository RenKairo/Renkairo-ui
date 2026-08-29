import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Moon, 
  Activity, 
  ChevronDown, 
  Layers, 
  Terminal,
  FolderOpen,
  Settings,
  Sparkles,
  User
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const TopCommandBar: React.FC = () => {
  const { setCommandPaletteOpen, metrics } = useIDEStore();
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
            {/* Japanese Torii / Mountain Styled Icon */}
            <div className="w-5 h-5 rounded bg-[#12151C] border border-[#232734] flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#FF4D4D]/20 to-transparent opacity-60"></div>
              <span className="text-[#FF4D4D] text-[10px] font-bold tracking-tighter z-10">⛩</span>
            </div>
            <span className="font-semibold text-gray-200 tracking-wide">RenKairo</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Project Dropdown */}
          {isProjectDropdownOpen && (
            <div 
              className="absolute left-0 top-9 w-60 bg-[#12151C] border border-[#232734] rounded-lg shadow-2xl py-1 z-50 text-gray-300"
              onMouseLeave={() => setIsProjectDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                Workspaces & Projects
              </div>
              <button className="w-full text-left px-3 py-2 text-xs hover:bg-[#181B24] hover:text-white flex items-center space-x-2">
                <FolderOpen className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>renkairo-platform</span>
                <span className="ml-auto text-[10px] bg-[#FF4D4D]/10 text-[#FF4D4D] px-1.5 py-0.5 rounded">Active</span>
              </button>
              <button className="w-full text-left px-3 py-2 text-xs hover:bg-[#181B24] hover:text-white flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>ai-models</span>
              </button>
              <button className="w-full text-left px-3 py-2 text-xs hover:bg-[#181B24] hover:text-white flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>data-pipeline</span>
              </button>
              <div className="border-t border-[#232734] my-1"></div>
              <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#181B24] text-gray-400 hover:text-gray-200 flex items-center space-x-2">
                <Settings className="w-3.5 h-3.5" />
                <span>Workspace Settings</span>
              </button>
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
            <span className="truncate">Search files, symbols, projects...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-[#181B24] border border-[#232734] px-1.5 py-0.5 rounded text-gray-400 font-mono">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center space-x-3 text-gray-400">
        {/* Pulse Telemetry Indicator */}
        <div className="flex items-center space-x-1.5 bg-[#12151C] border border-[#232734] px-2 py-0.5 rounded-full">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse-subtle" />
          <span className="text-[10px] font-mono text-emerald-400">{metrics?.cpu.usage || 23}% CPU</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 hover:bg-[#181B24] rounded-md hover:text-white transition-colors relative focus:outline-none"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF4D4D] rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#0B0D11]">
            </span>
          </button>

          {isNotifOpen && (
            <div 
              className="absolute right-0 top-9 w-72 bg-[#12151C] border border-[#232734] rounded-lg shadow-2xl p-3 z-50 text-gray-300"
              onMouseLeave={() => setIsNotifOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#232734] mb-2">
                <span className="font-semibold text-white">Notifications</span>
                <span className="text-[10px] bg-[#FF4D4D]/20 text-[#FF4D4D] px-1.5 py-0.5 rounded">3 New</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="bg-[#181B24] p-2 rounded border border-[#232734]">
                  <p className="font-medium text-white">Model Training Completed</p>
                  <p className="text-[10px] text-gray-400">PyTorch GPU 2 finished 100 epochs.</p>
                </div>
                <div className="bg-[#181B24] p-2 rounded border border-[#232734]">
                  <p className="font-medium text-white">FastAPI Reloaded</p>
                  <p className="text-[10px] text-gray-400">Uvicorn server auto-reloaded in 200ms.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documentation Toggle */}
        <button 
          title="Docs & Shortcuts" 
          className="p-1.5 hover:bg-[#181B24] rounded-md hover:text-white transition-colors focus:outline-none"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme Mode Toggle */}
        <button 
          title="Theme: East-Asian Dark Cyber" 
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
