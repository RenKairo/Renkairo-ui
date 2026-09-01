import React, { useState, useEffect, useRef } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  UploadCloud, 
  DownloadCloud, 
  RefreshCw, 
  Plus, 
  Minus,
  Undo2,
  FileCode, 
  ChevronDown, 
  ChevronRight, 
  History, 
  ExternalLink, 
  MoreHorizontal, 
  Check, 
  AlertCircle, 
  X, 
  FolderGit2, 
  Sparkles, 
  PlusCircle, 
  Trash2,
  SplitSquareHorizontal,
  Globe,
  Loader2
} from 'lucide-react';
import { useGitStore } from '../../store/gitStore';
import { useIDEStore } from '../../store/ideStore';
import { GitFileStatus } from '../../types/ide';

export const SourceControlPanel: React.FC = () => {
  const { 
    gitStatus, 
    isLoading, 
    isSyncing, 
    isCommitting, 
    commitMessage, 
    setCommitMessage, 
    isAmend, 
    setIsAmend, 
    branches, 
    commitLog, 
    isLogOpen, 
    setIsLogOpen, 
    error, 
    successMessage, 
    clearMessages, 
    refreshGitStatus, 
    stageFile, 
    stageAll, 
    unstageFile, 
    unstageAll, 
    discardFile, 
    discardAll, 
    commit, 
    push, 
    pull, 
    sync, 
    initRepo, 
    switchBranch, 
    createBranch, 
    loadBranches, 
    loadCommitLog, 
    openDiffTab, 
    addRemote, 
    cloneRepo 
  } = useGitStore();

  const { workspacePath, openFile } = useIDEStore();

  // Section collapse states
  const [isStagedOpen, setIsStagedOpen] = useState(true);
  const [isUnstagedOpen, setIsUnstagedOpen] = useState(true);
  const [isUntrackedOpen, setIsUntrackedOpen] = useState(true);
  const [isConflictsOpen, setIsConflictsOpen] = useState(true);

  // Popover / Modal states
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showAddRemoteModal, setShowAddRemoteModal] = useState(false);
  const [remoteName, setRemoteName] = useState('origin');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Initial and reactive git status fetch
  useEffect(() => {
    if (workspacePath) {
      refreshGitStatus();
      loadBranches();
      loadCommitLog();
    }
  }, [workspacePath]);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Ctrl+Enter in commit message textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('M')) {
      return <span className="text-[10px] font-bold text-amber-400 font-mono w-3.5 text-center shrink-0">M</span>;
    }
    if (s.includes('A')) {
      return <span className="text-[10px] font-bold text-emerald-400 font-mono w-3.5 text-center shrink-0">A</span>;
    }
    if (s.includes('D')) {
      return <span className="text-[10px] font-bold text-rose-400 font-mono w-3.5 text-center shrink-0">D</span>;
    }
    if (s.includes('R')) {
      return <span className="text-[10px] font-bold text-purple-400 font-mono w-3.5 text-center shrink-0">R</span>;
    }
    if (s.includes('U')) {
      return <span className="text-[10px] font-bold text-cyan-400 font-mono w-3.5 text-center shrink-0">U</span>;
    }
    return <span className="text-[10px] font-bold text-gray-400 font-mono w-3.5 text-center shrink-0">{status}</span>;
  };

  const renderFileRow = (
    item: GitFileStatus, 
    staged: boolean, 
    isUntracked: boolean = false
  ) => {
    const parts = item.path.split(/[/\\]/);
    const fileName = parts.pop() || item.path;
    const dirPath = parts.join('/');

    return (
      <div
        key={`${staged ? 'staged' : 'unstaged'}_${item.path}`}
        onClick={() => openDiffTab(item.path, staged, item.status)}
        className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#12151C] text-gray-300 group cursor-pointer border border-transparent hover:border-[#232734] transition-colors"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          {getStatusBadge(item.status)}
          <span className="truncate text-gray-200 font-mono text-[11px] group-hover:text-white">
            {fileName}
          </span>
          {dirPath && (
            <span className="text-[10px] text-gray-500 truncate font-mono">
              {dirPath}
            </span>
          )}
        </div>

        {/* Hover Action Buttons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Open direct editor */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFile(item.path, fileName);
            }}
            title="Open File"
            className="p-1 text-gray-400 hover:text-white hover:bg-[#181B24] rounded transition-colors"
          >
            <FileCode className="w-3 h-3" />
          </button>

          {/* View Diff */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDiffTab(item.path, staged, item.status);
            }}
            title="Open Changes (Diff)"
            className="p-1 text-[#38BDF8] hover:text-white hover:bg-[#181B24] rounded transition-colors"
          >
            <SplitSquareHorizontal className="w-3 h-3" />
          </button>

          {/* Discard / Delete */}
          {!staged && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Discard changes to "${fileName}"?`)) {
                  discardFile(item.path, isUntracked);
                }
              }}
              title={isUntracked ? 'Delete File' : 'Discard Changes'}
              className="p-1 text-gray-500 hover:text-rose-400 hover:bg-[#181B24] rounded transition-colors"
            >
              {isUntracked ? <Trash2 className="w-3 h-3" /> : <Undo2 className="w-3 h-3" />}
            </button>
          )}

          {/* Stage / Unstage */}
          {staged ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                unstageFile(item.path);
              }}
              title="Unstage Changes"
              className="p-1 text-gray-400 hover:text-amber-400 hover:bg-[#181B24] rounded transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stageFile(item.path);
              }}
              title="Stage Changes"
              className="p-1 text-gray-400 hover:text-emerald-400 hover:bg-[#181B24] rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // No Workspace Opened
  if (!workspacePath) {
    return (
      <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
        <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <span>SOURCE CONTROL</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
          <FolderGit2 className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-xs font-mono mb-2">No Folder Opened</p>
          <p className="text-[11px] text-gray-600">Open a folder to initialize or view Git source control.</p>
        </div>
      </aside>
    );
  }

  // Not a Git Repository View
  if (gitStatus && !gitStatus.isRepo && !isLoading) {
    return (
      <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
        <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <span>SOURCE CONTROL</span>
          <button 
            onClick={refreshGitStatus} 
            title="Refresh Status" 
            className="p-1 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-4 text-center justify-center items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#12151C] border border-[#232734] flex items-center justify-center shadow-lg">
            <FolderGit2 className="w-6 h-6 text-[#FF4D4D]" />
          </div>

          <div>
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide mb-1">
              Initialize Repository
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed max-w-[220px]">
              This workspace is not yet a Git repository. Initialize it to start tracking changes.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <button
              onClick={() => initRepo('main')}
              className="w-full py-2 bg-[#FF4D4D] hover:bg-[#FF6666] text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-md font-mono"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Initialize Repository</span>
            </button>

            <button
              onClick={() => setShowCloneModal(true)}
              className="w-full py-2 bg-[#12151C] hover:bg-[#181B24] border border-[#232734] text-sky-400 hover:text-sky-300 text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all font-mono"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Clone from GitHub</span>
            </button>
          </div>
        </div>

        {/* Clone Modal */}
        {showCloneModal && (
          <div className="p-3 border-t border-[#232734] bg-[#12151C] space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center text-gray-300 font-bold">
              <span>Clone Repository</span>
              <button onClick={() => setShowCloneModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="w-full bg-[#0B0D11] border border-[#232734] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
            />
            <button
              onClick={() => {
                if (cloneUrl.trim()) {
                  cloneRepo(cloneUrl.trim());
                  setShowCloneModal(false);
                }
              }}
              className="w-full py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-black font-semibold rounded text-xs transition-colors"
            >
              Clone
            </button>
          </div>
        )}
      </aside>
    );
  }

  const stagedList = gitStatus?.staged || [];
  const unstagedList = gitStatus?.unstaged || [];
  const untrackedList = gitStatus?.untracked || [];
  const conflictsList = gitStatus?.conflicts || [];
  const totalCount = gitStatus?.totalChanges || 0;

  return (
    <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans relative">
      {/* Header Bar */}
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider bg-[#0B0D11]">
        <div className="flex items-center space-x-1.5 overflow-hidden">
          <span className="truncate">SOURCE CONTROL</span>
          {totalCount > 0 && (
            <span className="text-[10px] bg-[#FF4D4D]/20 text-[#FF4D4D] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {totalCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* History Toggle */}
          <button
            onClick={() => {
              setIsLogOpen(!isLogOpen);
              if (!isLogOpen) loadCommitLog();
            }}
            title="View Commit History"
            className={`p-1 rounded transition-colors ${
              isLogOpen ? 'text-[#38BDF8] bg-[#12151C]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Sync (Pull & Push) */}
          <button
            onClick={sync}
            disabled={isSyncing}
            title={`Sync with Remote (Ahead: ${gitStatus?.ahead || 0}, Behind: ${gitStatus?.behind || 0})`}
            className="p-1 text-gray-400 hover:text-[#38BDF8] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#38BDF8]' : ''}`} />
          </button>

          {/* Pull */}
          <button
            onClick={pull}
            disabled={isSyncing}
            title="Pull Changes"
            className="p-1 text-gray-400 hover:text-[#38BDF8] transition-colors disabled:opacity-50"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-[#38BDF8]" />
          </button>

          {/* Push */}
          <button
            onClick={() => push(false)}
            disabled={isSyncing}
            title="Push Changes"
            className="p-1 text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* More Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="More Actions"
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-7 w-48 bg-[#12151C] border border-[#232734] rounded-lg shadow-2xl py-1 text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    stageAll();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stage All Changes</span>
                </button>

                <button
                  onClick={() => {
                    unstageAll();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
                >
                  <Minus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Unstage All Changes</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    if (window.confirm('Discard all unstaged working tree changes?')) {
                      discardAll();
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center space-x-2"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Discard All Changes</span>
                </button>

                <div className="border-t border-[#232734] my-1"></div>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowBranchModal(true);
                    loadBranches();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[#FF4D4D]" />
                  <span>Create / Switch Branch</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowAddRemoteModal(true);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Add Remote Origin...</span>
                </button>

                {gitStatus?.githubUrl && (
                  <a
                    href={gitStatus.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Open in GitHub</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications / Error Banner */}
      {error && (
        <div className="bg-rose-950/60 border-b border-rose-800/60 px-3 py-2 text-rose-300 text-xs flex items-start justify-between font-mono">
          <div className="flex items-start space-x-1.5 flex-1 pr-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
            <span className="text-[11px] leading-tight break-all">{error}</span>
          </div>
          <button onClick={clearMessages} className="text-rose-400 hover:text-white p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/60 px-3 py-1.5 text-emerald-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center space-x-1.5 truncate">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] truncate">{successMessage}</span>
          </div>
          <button onClick={clearMessages} className="text-emerald-400 hover:text-white p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Branch & Remote Info Strip */}
      <div className="p-2 border-b border-[#232734] bg-[#0B0D11]">
        <div className="flex items-center justify-between text-xs font-mono bg-[#12151C] p-2 rounded-lg border border-[#232734]">
          <button
            onClick={() => {
              setShowBranchModal(true);
              loadBranches();
            }}
            title="Click to Switch Branch"
            className="flex items-center space-x-2 hover:text-white text-gray-200 transition-colors truncate"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#FF4D4D] shrink-0" />
            <span className="font-semibold truncate">{gitStatus?.branch || 'main'}</span>
            <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
          </button>

          <div className="flex items-center space-x-2 text-[10px] text-gray-400">
            {gitStatus?.upstream && (
              <span className="text-gray-500 truncate max-w-[90px]" title={gitStatus.upstream}>
                {gitStatus.upstream}
              </span>
            )}

            {/* Ahead / Behind indicators */}
            {((gitStatus?.ahead || 0) > 0 || (gitStatus?.behind || 0) > 0) && (
              <button
                onClick={sync}
                title="Sync commits"
                className="flex items-center space-x-1 bg-[#181B24] px-1.5 py-0.5 rounded text-sky-400 hover:bg-[#232734]"
              >
                {(gitStatus?.behind || 0) > 0 && <span>↓{gitStatus?.behind}</span>}
                {(gitStatus?.ahead || 0) > 0 && <span>↑{gitStatus?.ahead}</span>}
              </button>
            )}

            {gitStatus?.githubUrl && (
              <a
                href={gitStatus.githubUrl}
                target="_blank"
                rel="noreferrer"
                title="Open GitHub Repository"
                className="text-gray-400 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Commit Message Box */}
        <div className="mt-2 space-y-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message (Ctrl+Enter to commit)"
            rows={2}
            className="w-full bg-[#12151C] border border-[#232734] rounded-lg p-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#FF4D4D] font-mono resize-none leading-normal"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-1.5 text-[11px] text-gray-400 cursor-pointer hover:text-gray-200">
              <input
                type="checkbox"
                checked={isAmend}
                onChange={(e) => setIsAmend(e.target.checked)}
                className="rounded border-[#232734] bg-[#12151C] text-[#FF4D4D] focus:ring-0 w-3 h-3"
              />
              <span>Amend</span>
            </label>

            <button
              onClick={() => commit()}
              disabled={isCommitting || !commitMessage.trim()}
              className="py-1 px-4 bg-[#FF4D4D] hover:bg-[#FF6666] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-md font-mono disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCommitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitCommit className="w-3.5 h-3.5" />
              )}
              <span>{isCommitting ? 'Committing...' : isAmend ? 'Amend Commit' : 'Commit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Changes List or Commit History */}
      {isLogOpen ? (
        /* Commit Log Timeline */
        <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase px-1 pb-1 border-b border-[#232734]">
            <span>RECENT COMMITS ({commitLog.length})</span>
            <button
              onClick={() => setIsLogOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              Back to Changes
            </button>
          </div>

          {commitLog.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">No commits found.</div>
          ) : (
            commitLog.map((log) => (
              <div
                key={log.hash}
                className="p-2 rounded-lg bg-[#12151C]/60 hover:bg-[#12151C] border border-[#232734] space-y-1 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-[#181B24] text-[#38BDF8] px-1.5 py-0.5 rounded font-bold">
                    {log.shortHash}
                  </span>
                  <span className="text-[10px] text-gray-500">{log.date}</span>
                </div>
                <p className="text-gray-200 text-[11px] leading-tight font-medium">
                  {log.message}
                </p>
                <div className="text-[10px] text-gray-400 truncate">
                  {log.authorName}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Source Control Changes List */
        <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs select-none">
          {/* Conflicts Section */}
          {conflictsList.length > 0 && (
            <div className="space-y-1 bg-rose-950/20 rounded-lg p-1.5 border border-rose-800/40">
              <div 
                onClick={() => setIsConflictsOpen(!isConflictsOpen)}
                className="flex justify-between items-center text-[10px] text-rose-400 font-semibold uppercase px-1 cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  {isConflictsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span>MERGE CONFLICTS ({conflictsList.length})</span>
                </div>
              </div>

              {isConflictsOpen && conflictsList.map((file) => renderFileRow(file, false))}
            </div>
          )}

          {/* Staged Changes Section */}
          <div className="space-y-0.5">
            <div 
              onClick={() => setIsStagedOpen(!isStagedOpen)}
              className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase px-1 py-1 hover:bg-[#12151C] rounded cursor-pointer group"
            >
              <div className="flex items-center space-x-1">
                {isStagedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>STAGED CHANGES ({stagedList.length})</span>
              </div>

              {stagedList.length > 0 && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unstageAll();
                    }}
                    title="Unstage All Changes"
                    className="p-0.5 hover:text-amber-400 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {isStagedOpen && (
              <div className="space-y-0.5">
                {stagedList.length === 0 ? (
                  <div className="text-[10px] text-gray-600 px-3 py-1 italic">
                    No staged changes
                  </div>
                ) : (
                  stagedList.map((file) => renderFileRow(file, true))
                )}
              </div>
            )}
          </div>

          {/* Unstaged Changes Section */}
          <div className="space-y-0.5">
            <div 
              onClick={() => setIsUnstagedOpen(!isUnstagedOpen)}
              className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase px-1 py-1 hover:bg-[#12151C] rounded cursor-pointer group"
            >
              <div className="flex items-center space-x-1">
                {isUnstagedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>CHANGES ({unstagedList.length})</span>
              </div>

              {unstagedList.length > 0 && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Discard all unstaged changes?')) {
                        discardAll();
                      }
                    }}
                    title="Discard All Changes"
                    className="p-0.5 hover:text-rose-400 transition-colors"
                  >
                    <Undo2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stageAll();
                    }}
                    title="Stage All Changes"
                    className="p-0.5 hover:text-emerald-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {isUnstagedOpen && (
              <div className="space-y-0.5">
                {unstagedList.length === 0 ? (
                  <div className="text-[10px] text-gray-600 px-3 py-1 italic">
                    No modified files
                  </div>
                ) : (
                  unstagedList.map((file) => renderFileRow(file, false))
                )}
              </div>
            )}
          </div>

          {/* Untracked Files Section */}
          {untrackedList.length > 0 && (
            <div className="space-y-0.5">
              <div 
                onClick={() => setIsUntrackedOpen(!isUntrackedOpen)}
                className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase px-1 py-1 hover:bg-[#12151C] rounded cursor-pointer group"
              >
                <div className="flex items-center space-x-1">
                  {isUntrackedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span>UNTRACKED ({untrackedList.length})</span>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stageAll();
                    }}
                    title="Stage All Untracked Files"
                    className="p-0.5 hover:text-emerald-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {isUntrackedOpen && (
                <div className="space-y-0.5">
                  {untrackedList.map((file) => renderFileRow(file, false, true))}
                </div>
              )}
            </div>
          )}

          {/* Clean State Notice */}
          {totalCount === 0 && (
            <div className="p-6 text-center text-gray-500 font-mono text-xs flex flex-col items-center justify-center space-y-2">
              <Check className="w-8 h-8 text-emerald-400/60" />
              <p className="text-gray-300 font-medium">Working tree is clean</p>
              <p className="text-[11px] text-gray-500">No pending changes in this repository.</p>
            </div>
          )}
        </div>
      )}

      {/* Branch Switcher Modal Popover */}
      {showBranchModal && (
        <div 
          className="absolute inset-0 bg-[#0B0D11]/90 backdrop-blur-sm z-50 p-4 flex flex-col font-mono text-xs animate-in fade-in duration-150"
          onClick={() => setShowBranchModal(false)}
        >
          <div 
            className="bg-[#12151C] border border-[#232734] rounded-xl p-3 shadow-2xl flex flex-col max-h-[85%] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#232734] mb-2 text-gray-200 font-bold">
              <div className="flex items-center space-x-1.5">
                <GitBranch className="w-4 h-4 text-[#FF4D4D]" />
                <span>Switch / Create Branch</span>
              </div>
              <button onClick={() => setShowBranchModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Branch Input */}
            <div className="space-y-1 mb-3">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Create New Branch</span>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="new-branch-name..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1 bg-[#0B0D11] border border-[#232734] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF4D4D]"
                />
                <button
                  onClick={() => {
                    if (newBranchName.trim()) {
                      createBranch(newBranchName.trim());
                      setNewBranchName('');
                      setShowBranchModal(false);
                    }
                  }}
                  disabled={!newBranchName.trim()}
                  className="px-2.5 py-1 bg-[#FF4D4D] hover:bg-[#FF6666] text-white rounded text-xs font-semibold disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Filter Branches */}
            <input
              type="text"
              placeholder="Search branches..."
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full bg-[#0B0D11] border border-[#232734] rounded px-2 py-1 text-xs text-white mb-2 focus:outline-none focus:border-[#38BDF8]"
            />

            {/* Branch List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {branches
                .filter((b) => b.name.toLowerCase().includes(branchFilter.toLowerCase()))
                .map((b) => (
                  <div
                    key={b.name}
                    onClick={() => {
                      if (!b.isCurrent) {
                        switchBranch(b.name);
                        setShowBranchModal(false);
                      }
                    }}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                      b.isCurrent
                        ? 'bg-[#FF4D4D]/20 text-white font-bold border border-[#FF4D4D]/40'
                        : 'hover:bg-[#181B24] text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <GitBranch className={`w-3.5 h-3.5 ${b.isCurrent ? 'text-[#FF4D4D]' : 'text-gray-500'}`} />
                      <span className="truncate">{b.name}</span>
                    </div>

                    {b.isCurrent && (
                      <span className="text-[10px] text-[#FF4D4D] font-bold">CURRENT</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Remote Modal Popover */}
      {showAddRemoteModal && (
        <div 
          className="absolute inset-0 bg-[#0B0D11]/90 backdrop-blur-sm z-50 p-4 flex flex-col font-mono text-xs animate-in fade-in duration-150"
          onClick={() => setShowAddRemoteModal(false)}
        >
          <div 
            className="bg-[#12151C] border border-[#232734] rounded-xl p-3 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#232734] text-gray-200 font-bold">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>Add Git Remote</span>
              </div>
              <button onClick={() => setShowAddRemoteModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Remote Name</label>
              <input
                type="text"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                placeholder="origin"
                className="w-full bg-[#0B0D11] border border-[#232734] rounded px-2 py-1 text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Remote Repository URL</label>
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git"
                className="w-full bg-[#0B0D11] border border-[#232734] rounded px-2 py-1 text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <button
              onClick={() => {
                if (remoteUrl.trim()) {
                  addRemote(remoteName.trim() || 'origin', remoteUrl.trim());
                  setShowAddRemoteModal(false);
                }
              }}
              disabled={!remoteUrl.trim()}
              className="w-full py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded transition-colors disabled:opacity-40"
            >
              Add Remote
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
