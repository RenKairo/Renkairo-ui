import React from 'react';
import { 
  GitBranch, 
  RotateCw, 
  Loader2, 
  FolderOpen, 
  Server
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useGitStore } from '../../store/gitStore';
import { ToriiIcon } from '../common/ToriiIcon';
import { getBackendBaseUrl, subscribeBackendUrlChange } from '../../services/apiConfig';

export const StatusBar: React.FC = () => {
  const { cursorPos, rootName, isFolderOpening, setActiveActivity } = useIDEStore();
  const { gitStatus, isSyncing, sync } = useGitStore();
  const [backendUrl, setBackendUrl] = React.useState(getBackendBaseUrl);

  React.useEffect(() => {
    return subscribeBackendUrlChange((url) => setBackendUrl(url));
  }, []);

  const isRepo = gitStatus?.isRepo;
  const branchName = gitStatus?.branch || '';
  const ahead = gitStatus?.ahead || 0;
  const behind = gitStatus?.behind || 0;

  return (
    <footer className="h-6 bg-[var(--bg-panel)] border-t border-[var(--border-color)] px-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none z-30 font-sans transition-colors duration-150">
      {/* Left: Brand & Live Git / Workspace Status */}
      <div className="flex items-center space-x-3">
        {/* Brand Icon Tag */}
        <div className="flex items-center space-x-1.5 pr-2.5 border-r border-[var(--border-color)] group cursor-default">
          <ToriiIcon color="var(--accent-coral)" className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] text-[var(--text-primary)] font-bold tracking-tight">RENKAIRO</span>
        </div>

        {isFolderOpening ? (
          <div className="flex items-center space-x-1.5 text-[var(--accent-coral)] font-mono">
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
                  className="flex items-center space-x-1 hover:text-[var(--text-primary)] transition-colors group cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[var(--accent-coral)] group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{branchName}</span>
                </button>

                {/* Ahead / Behind Sync Button */}
                <button
                  onClick={sync}
                  disabled={isSyncing}
                  title={`Synchronize Changes (↓ ${behind}, ↑ ${ahead}). Click to sync.`}
                  className="flex items-center space-x-1 hover:text-[var(--text-primary)] transition-colors font-mono text-[10px] text-[var(--text-muted)] cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[var(--accent-coral)]' : ''}`} />
                  {(ahead > 0 || behind > 0) && (
                    <span className="text-[var(--text-primary)] font-semibold">
                      {behind > 0 && `↓${behind}`} {ahead > 0 && `↑${ahead}`}
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Environment & Cursor Meta */}
      <div className="flex items-center space-x-4 font-mono text-[10px]">
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        
        {/* Remote Shiro Backend Indicator (Read-Only) */}
        <div
          title={`Active Shiro Backend: ${backendUrl}`}
          className="flex items-center space-x-1 text-[var(--accent-coral)] px-1 py-0.5 select-none"
        >
          <Server className="w-3 h-3 text-[var(--accent-coral)] shrink-0" />
          <span className="truncate max-w-[140px] font-mono">{backendUrl.replace(/^https?:\/\//i, '')}</span>
        </div>
      </div>
    </footer>
  );
};
