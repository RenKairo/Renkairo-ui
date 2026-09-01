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
    <footer className="h-6 bg-[#0B0D11] border-t border-[#232734] px-3 flex items-center justify-between text-[11px] text-gray-400 select-none z-30 font-sans">
      {/* Left: Branch & Problems Counter / Live Status */}
      <div className="flex items-center space-x-3">
        {/* Brand Icon Tag */}
        <div className="flex items-center space-x-1.5 pr-2.5 border-r border-[#232734] group cursor-default">
          <ToriiIcon className="w-3.5 h-3.5 group-hover:drop-shadow-[0_0_4px_rgba(255,77,77,0.8)] transition-all" />
          <span className="font-mono text-[10px] text-gray-300 font-bold tracking-tight">RENKAIRO</span>
        </div>

        {isFolderOpening ? (
          <div className="flex items-center space-x-1.5 text-[#38BDF8] font-mono animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Opening workspace...</span>
          </div>
        ) : (
          <>
            {/* Active Workspace */}
            <div className="flex items-center space-x-1">
              <FolderOpen className="w-3.5 h-3.5 text-[#FF4D4D]" />
              <span className="font-mono text-gray-200">{rootName || 'No Folder'}</span>
            </div>

            {/* Git Branch & Sync Indicator (VS Code style) */}
            {isRepo && branchName && (
              <div className="flex items-center space-x-2 pl-2 border-l border-[#232734]">
                <button 
                  onClick={() => setActiveActivity('git')}
                  title={`Current Git Branch: ${branchName}. Click to open Source Control.`}
                  className="flex items-center space-x-1 hover:text-white transition-colors group"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[#FF4D4D] group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-semibold text-gray-200">{branchName}</span>
                </button>

                {/* Ahead / Behind Sync Button */}
                <button
                  onClick={sync}
                  disabled={isSyncing}
                  title={`Synchronize Changes (↓ ${behind}, ↑ ${ahead}). Click to sync.`}
                  className="flex items-center space-x-1 hover:text-[#38BDF8] transition-colors font-mono text-[10px] text-gray-400"
                >
                  <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#38BDF8]' : ''}`} />
                  {(ahead > 0 || behind > 0) && (
                    <span className="text-sky-400 font-semibold">
                      {behind > 0 && `↓${behind}`} {ahead > 0 && `↑${ahead}`}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Problems Badges */}
            <div className="flex items-center space-x-2 pl-2 border-l border-[#232734]">
              <div className="flex items-center space-x-0.5 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">{errorCount}</span>
              </div>
              <div className="flex items-center space-x-0.5 text-amber-400">
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
        <div className="flex items-center space-x-1 text-[#38BDF8]">
          <Terminal className="w-3 h-3" />
          <span>Local Engine</span>
        </div>

        {/* Status Formatter */}
        <div className="flex items-center space-x-1 text-emerald-400">
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Ready</span>
        </div>
      </div>
    </footer>
  );
};
