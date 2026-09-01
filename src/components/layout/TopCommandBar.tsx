import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Moon, 
  Sun,
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
    theme,
    toggleTheme,
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
    <header className="h-11 bg-[var(--bg-panel)] border-b border-[var(--border-color)] px-3 flex items-center justify-between text-xs select-none z-30 relative transition-colors duration-150">
      {/* Left: Brand Logo & Workspace Switcher */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button 
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors focus:outline-none"
          >
            {/* Japanese Torii Emblem */}
            <div className="w-5 h-5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center relative overflow-hidden group p-0.5">
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-coral)]/20 to-transparent opacity-60"></div>
              <ToriiIcon color="var(--accent-coral)" className="w-3.5 h-3.5 z-10 drop-shadow-[0_0_6px_var(--glow-coral)] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-semibold tracking-wide font-mono">
              {rootName ? rootName : 'RenKairo IDE'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {/* Workspace Dropdown */}
          {isProjectDropdownOpen && (
            <div 
              className="absolute left-0 top-9 w-72 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 z-50 text-[var(--text-secondary)]"
              onMouseLeave={() => setIsProjectDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center justify-between">
                <span>Active Scope</span>
              </div>

              {workspacePath ? (
                <div className="px-3 py-2 text-xs bg-[var(--bg-card)] flex items-center space-x-2 border-y border-[var(--border-color)]">
                  <FolderOpen className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
                  <div className="overflow-hidden flex-1">
                    <p className="font-mono text-[var(--text-primary)] truncate font-medium">{rootName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{workspacePath}</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-[var(--accent-emerald)] shrink-0" />
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-[var(--text-muted)] font-mono">
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
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] text-[var(--accent-cyan)] rounded flex items-center space-x-2 transition-colors font-medium"
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
          className="w-full h-7 bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/60 rounded-md px-3 flex items-center justify-between text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-xs focus:outline-none shadow-sm"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="truncate">Search commands, files, actions...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-muted)] font-mono">
            <span>Ctrl</span>+<span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center space-x-3 text-[var(--text-muted)]">
        <div className="flex items-center space-x-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded-full shadow-sm">
          <Activity className="w-3.5 h-3.5 text-[var(--accent-emerald)] animate-pulse-subtle" />
          <span className="text-[10px] font-mono text-[var(--accent-emerald)] font-medium">{metrics?.cpu.usage || 18}% CPU</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md hover:text-[var(--text-primary)] transition-colors relative focus:outline-none"
            title="System Status Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {isNotifOpen && (
            <div 
              className="absolute right-0 top-9 w-72 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-2xl p-3 z-50 text-[var(--text-secondary)]"
              onMouseLeave={() => setIsNotifOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] mb-2">
                <span className="font-semibold text-[var(--text-primary)]">System Status</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-color)] flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center shrink-0 p-0.5">
                    <ToriiIcon color="var(--accent-coral)" className="w-4 h-4 drop-shadow-[0_0_4px_var(--glow-coral)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">RenKairo Core</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{workspacePath ? `Active: ${rootName}` : 'Ready to open folder'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle (Swappable Dark / Light Mode) */}
        <button 
          onClick={toggleTheme}
          title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"} 
          className={`p-1.5 rounded-md transition-all focus:outline-none ${
            theme === 'dark' 
              ? 'hover:bg-[var(--bg-hover)] text-amber-400 hover:text-amber-300' 
              : 'hover:bg-[var(--bg-hover)] text-amber-500 hover:text-amber-600'
          }`}
          aria-label="Toggle Color Theme"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
          ) : (
            <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[var(--border-color)]">
          <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--accent-coral)]/60 flex items-center justify-center overflow-hidden shadow-sm">
            <User className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
          </div>
        </div>
      </div>
    </header>
  );
};
