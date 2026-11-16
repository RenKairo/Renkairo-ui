import React, { useState } from 'react';
import { 
  Search,  
  ChevronDown, 
  FolderOpen, 
  FolderSync, 
  User, 
  Check, 
  LogOut, 
  Server 
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useAuthStore } from '../../store/authStore';

export const TopCommandBar: React.FC = () => {
  const { 
    setCommandPaletteOpen, 
    rootName, 
    workspacePath,
    openFolder,
    changeScopeFolder,
    setConnectServerModalOpen,
    isRemoteServerConnected,
    remoteServerUrl,
    remoteServerName,
  } = useIDEStore();

  const { user, isAuthenticated, setAuthModalOpen, logout } = useAuthStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  return (
    <header className="h-11 bg-[var(--bg-panel)] border-b border-[var(--border-color)] px-3 flex items-center justify-between text-xs select-none z-30 relative transition-colors duration-150">
      {/* Left: Project / Workspace Switcher */}
      <div className="flex items-center space-x-3">
        <div className="relative">
          <button 
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors focus:outline-none"
          >
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
                  <FolderOpen className="w-4 h-4 text-[var(--accent-coral)] shrink-0" />
                  <div className="overflow-hidden flex-1">
                    <p className="font-mono text-[var(--text-primary)] truncate font-medium">{rootName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{workspacePath}</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-primary)] hover:text-[var(--accent-coral)] rounded flex items-center space-x-2 transition-colors font-medium"
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
          className="w-full h-7 bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent-coral)]/60 rounded-md px-3 flex items-center justify-between text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-xs focus:outline-none shadow-sm"
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

      {/* Right: Actions */}
      <div className="flex items-center space-x-3 text-[var(--text-muted)]">
        {/* Connect Server Button */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              setAuthModalOpen(true);
              return;
            }
            setConnectServerModalOpen(true);
          }}
          title={
            isRemoteServerConnected 
              ? `Connected to ${remoteServerName || remoteServerUrl || 'Shiro Server'}. Click to manage connection.`
              : 'Connect to Remote Server (SSH & Shiro Backend)'
          }
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition-all text-xs font-mono font-semibold cursor-pointer shadow-sm group ${
            isRemoteServerConnected
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
              : 'bg-[var(--accent-coral)]/10 hover:bg-[var(--accent-coral)]/20 text-[var(--accent-coral)] border-[var(--accent-coral)]/30 hover:border-[var(--accent-coral)]/60'
          }`}
        >
          <Server className="w-3.5 h-3.5 group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden sm:inline truncate max-w-[140px]">
            {isRemoteServerConnected ? (remoteServerName || 'Connected') : 'Connect Server'}
          </span>
          {isRemoteServerConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          )}
        </button>

        {/* User Profile Avatar & Login Trigger */}
        <div className="pl-2 border-l border-[var(--border-color)] flex items-center space-x-2">
          <button
            onClick={() => setAuthModalOpen(true)}
            title={isAuthenticated && user ? `Logged in as ${user.username}` : "Sign In / Register"}
            className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all cursor-pointer focus:outline-none"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--accent-coral)] flex items-center justify-center text-white text-[10px] font-bold font-mono">
              {isAuthenticated && user ? user.username.charAt(0).toUpperCase() : <User className="w-3 h-3 text-white" />}
            </div>
            <span className="hidden md:inline font-mono text-[10px] font-semibold truncate max-w-[100px]">
              {isAuthenticated && user ? user.username : 'Sign In'}
            </span>
          </button>

          {isAuthenticated && user && (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent-coral)] transition-colors cursor-pointer focus:outline-none"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
