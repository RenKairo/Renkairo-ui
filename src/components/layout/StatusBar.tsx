import React from 'react';
import { 
  GitBranch, 
  RotateCw, 
  AlertCircle, 
  AlertTriangle, 
  CheckCheck,
  Terminal,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useGitStore } from '../../store/gitStore';
import { ToriiIcon } from '../common/ToriiIcon';

export const StatusBar: React.FC = () => {
  const { cursorPos, problems, rootName, isFolderOpening, setActiveActivity } = useIDEStore();
  const { gitStatus, isSyncing, sync, refreshGitStatus } = useGitStore();
  
  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  const isRepo = gitStatus?.isRepo;
  const branchName = gitStatus?.branch || '';
  const ahead = gitStatus?.ahead || 0;
  const behind = gitStatus?.behind || 0;

  return (
    <footer className="h-6 bg-[var(--bg-panel)] border-t border-[var(--border-color)] px-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none z-30 font-sans transition-colors duration-150">
      {/* Left: Branch & Problems Counter / Live Status */}
      <div className="flex items-center space-x-3">
        {/* Brand Icon Tag */}
        <div className="flex items-center space-x-1.5 pr-2.5 border-r border-[var(--border-color)] group cursor-default">
          <ToriiIcon color="var(--accent-coral)" className="w-3.5 h-3.5 group-hover:drop-shadow-[0_0_4px_var(--glow-coral)] transition-all" />
          <span className="font-mono text-[10px] text-[var(--text-primary)] font-bold tracking-tight">RENKAIRO</span>
        </div>

        {isFolderOpening ? (
          <div className="flex items-center space-x-1.5 text-[var(--accent-cyan)] font-mono animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Opening workspace...</span>
          </div>
        ) : (
          <>
            {/* Active Workspace */}
            <div className="flex items-center space-x-1">
              <FolderOpen className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
              <span className="font-mono text-[var(--text-primary)] font-medium">{rootName || 'No Folder'}</span>
            </div>

            {/* Git Branch & Sync Indicator */}
            {isRepo && branchName && (
              <div className="flex items-center space-x-2 pl-2 border-l border-[var(--border-color)]">
                <button 
                  onClick={() => setActiveActivity('git')}
                  title={`Current Git Branch: ${branchName}. Click to open Source Control.`}
                  className="flex items-center space-x-1 hover:text-[var(--text-primary)] transition-colors group"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[var(--accent-coral)] group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{branchName}</span>
                </button>

                {/* Ahead / Behind Sync Button */}
                <button
                  onClick={sync}
                  disabled={isSyncing}
                  title={`Synchronize Changes (↓ ${behind}, ↑ ${ahead}). Click to sync.`}
                  className="flex items-center space-x-1 hover:text-[var(--accent-cyan)] transition-colors font-mono text-[10px] text-[var(--text-muted)]"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[var(--accent-cyan)]' : ''}`} />
                  {(ahead > 0 || behind > 0) && (
                    <span className="text-[var(--accent-cyan)] font-semibold">
                      {behind > 0 && `↓${behind}`} {ahead > 0 && `↑${ahead}`}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Problems Badges */}
            <div className="flex items-center space-x-2 pl-2 border-l border-[var(--border-color)]">
              <div className="flex items-center space-x-0.5 text-rose-500">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">{errorCount}</span>
              </div>
              <div className="flex items-center space-x-0.5 text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold">{warningCount}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: Environment & Cursor Meta */}
      <div className="flex items-center space-x-4 font-mono text-[10px]">
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span className="hidden sm:inline">Spaces: 4</span>
        <span className="hidden sm:inline">UTF-8</span>
        <span className="hidden sm:inline">LF</span>
        
        {/* Environment Indicator */}
        <div className="flex items-center space-x-1 text-[var(--accent-cyan)]">
          <Terminal className="w-3 h-3" />
          <span>Local Engine</span>
        </div>

        {/* Status Formatter */}
        <div className="flex items-center space-x-1 text-emerald-500 font-medium">
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Ready</span>
        </div>
      </div>
    </footer>
  );
};
