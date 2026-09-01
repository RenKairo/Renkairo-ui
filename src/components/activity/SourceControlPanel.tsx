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
      return <span className="text-[10px] font-bold text-amber-500 font-mono w-3.5 text-center shrink-0">M</span>;
    }
    if (s.includes('A')) {
      return <span className="text-[10px] font-bold text-emerald-500 font-mono w-3.5 text-center shrink-0">A</span>;
    }
    if (s.includes('D')) {
      return <span className="text-[10px] font-bold text-rose-500 font-mono w-3.5 text-center shrink-0">D</span>;
    }
    if (s.includes('R')) {
      return <span className="text-[10px] font-bold text-purple-500 font-mono w-3.5 text-center shrink-0">R</span>;
    }
    if (s.includes('U')) {
      return <span className="text-[10px] font-bold text-[var(--accent-cyan)] font-mono w-3.5 text-center shrink-0">U</span>;
    }
    return <span className="text-[10px] font-bold text-[var(--text-muted)] font-mono w-3.5 text-center shrink-0">{status}</span>;
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
        className="flex items-center justify-between py-1 px-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] group cursor-pointer border border-transparent hover:border-[var(--border-color)] transition-colors"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          {getStatusBadge(item.status)}
          <span className="truncate text-[var(--text-primary)] font-mono text-[11px] group-hover:text-[var(--text-primary)]">
            {fileName}
          </span>
          {dirPath && (
            <span className="text-[10px] text-[var(--text-muted)] truncate font-mono">
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
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded transition-colors"
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
            className="p-1 text-[var(--accent-cyan)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded transition-colors"
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
              className="p-1 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-card)] rounded transition-colors"
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
              className="p-1 text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-card)] rounded transition-colors"
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
              className="p-1 text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-card)] rounded transition-colors"
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
      <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
        <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
          <span>SOURCE CONTROL</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)]">
          <FolderGit2 className="w-10 h-10 text-[var(--text-subtle)] mb-3" />
          <p className="text-xs font-mono mb-2">No Folder Opened</p>
          <p className="text-[11px] text-[var(--text-subtle)]">Open a folder to initialize or view Git source control.</p>
        </div>
      </aside>
    );
  }

  // Not a Git Repository View
  if (gitStatus && !gitStatus.isRepo && !isLoading) {
    return (
      <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
        <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
          <span>SOURCE CONTROL</span>
          <button 
            onClick={refreshGitStatus} 
            title="Refresh Status" 
            className="p-1 hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-4 text-center justify-center items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shadow-lg">
            <FolderGit2 className="w-6 h-6 text-[var(--accent-coral)]" />
          </div>

          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase tracking-wide mb-1">
              Initialize Repository
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed max-w-[220px]">
              This workspace is not yet a Git repository. Initialize it to start tracking changes.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <button
              onClick={() => initRepo('main')}
              className="w-full py-2 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-md font-mono cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Initialize Repository</span>
            </button>

            <button
              onClick={() => setShowCloneModal(true)}
              className="w-full py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--accent-cyan)] text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all font-mono cursor-pointer shadow-sm"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Clone from GitHub</span>
            </button>
          </div>
        </div>

        {/* Clone Modal */}
        {showCloneModal && (
          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] space-y-2 font-mono text-xs shadow-lg">
            <div className="flex justify-between items-center text-[var(--text-primary)] font-bold">
              <span>Clone Repository</span>
              <button onClick={() => setShowCloneModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] shadow-sm"
            />
            <button
              onClick={() => {
                if (cloneUrl.trim()) {
                  cloneRepo(cloneUrl.trim());
                  setShowCloneModal(false);
                }
              }}
              className="w-full py-1.5 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-hover)] text-white font-semibold rounded text-xs transition-colors shadow-sm"
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
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans relative transition-colors duration-150">
      {/* Header Bar */}
      <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider bg-[var(--bg-panel)]">
        <div className="flex items-center space-x-1.5 overflow-hidden">
          <span className="truncate">SOURCE CONTROL</span>
          {totalCount > 0 && (
            <span className="text-[10px] bg-[var(--accent-coral)]/20 text-[var(--accent-coral)] px-1.5 py-0.2 rounded-full font-mono font-bold">
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
              isLogOpen ? 'text-[var(--accent-cyan)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Sync (Pull & Push) */}
          <button
            onClick={sync}
            disabled={isSyncing}
            title={`Sync with Remote (Ahead: ${gitStatus?.ahead || 0}, Behind: ${gitStatus?.behind || 0})`}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--accent-cyan)]' : ''}`} />
          </button>

          {/* Pull */}
          <button
            onClick={pull}
            disabled={isSyncing}
            title="Pull Changes"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors disabled:opacity-50"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
          </button>

          {/* Push */}
          <button
            onClick={() => push(false)}
            disabled={isSyncing}
            title="Push Changes"
            className="p-1 text-[var(--text-muted)] hover:text-emerald-500 transition-colors disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
          </button>

          {/* More Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="More Actions"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-7 w-48 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs text-[var(--text-secondary)] z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    stageAll();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Stage All Changes</span>
                </button>

                <button
                  onClick={() => {
                    unstageAll();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
                >
                  <Minus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Unstage All Changes</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    if (window.confirm('Discard all unstaged working tree changes?')) {
                      discardAll();
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 flex items-center space-x-2"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Discard All Changes</span>
                </button>

                <div className="border-t border-[var(--border-color)] my-1"></div>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowBranchModal(true);
                    loadBranches();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
                >
                  <GitBranch className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                  <span>Create / Switch Branch</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowAddRemoteModal(true);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
                >
                  <Globe className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                  <span>Add Remote Origin...</span>
                </button>

                {gitStatus?.githubUrl && (
                  <a
                    href={gitStatus.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
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
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-3 py-2 text-rose-500 text-xs flex items-start justify-between font-mono">
          <div className="flex items-start space-x-1.5 flex-1 pr-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
            <span className="text-[11px] leading-tight break-all">{error}</span>
          </div>
          <button onClick={clearMessages} className="text-rose-500 hover:text-[var(--text-primary)] p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-3 py-1.5 text-emerald-500 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center space-x-1.5 truncate">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[11px] truncate">{successMessage}</span>
          </div>
          <button onClick={clearMessages} className="text-emerald-500 hover:text-[var(--text-primary)] p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Branch & Remote Info Strip */}
      <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-panel)]">
        <div className="flex items-center justify-between text-xs font-mono bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)] shadow-sm">
          <button
            onClick={() => {
              setShowBranchModal(true);
              loadBranches();
            }}
            title="Click to Switch Branch"
            className="flex items-center space-x-2 hover:text-[var(--text-primary)] text-[var(--text-primary)] transition-colors truncate"
          >
            <GitBranch className="w-3.5 h-3.5 text-[var(--accent-coral)] shrink-0" />
            <span className="font-semibold truncate">{gitStatus?.branch || 'main'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          </button>

          <div className="flex items-center space-x-2 text-[10px] text-[var(--text-muted)]">
            {gitStatus?.upstream && (
              <span className="text-[var(--text-subtle)] truncate max-w-[90px]" title={gitStatus.upstream}>
                {gitStatus.upstream}
              </span>
            )}

            {/* Ahead / Behind indicators */}
            {((gitStatus?.ahead || 0) > 0 || (gitStatus?.behind || 0) > 0) && (
              <button
                onClick={sync}
                title="Sync commits"
                className="flex items-center space-x-1 bg-[var(--bg-panel)] px-1.5 py-0.5 rounded text-[var(--accent-cyan)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] shadow-sm"
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
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg p-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-coral)] font-mono resize-none leading-normal shadow-sm"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-1.5 text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isAmend}
                onChange={(e) => setIsAmend(e.target.checked)}
                className="rounded border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--accent-coral)] focus:ring-0 w-3 h-3"
              />
              <span>Amend</span>
            </label>

            <button
              onClick={() => commit()}
              disabled={isCommitting || !commitMessage.trim()}
              className="py-1 px-4 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all shadow-md font-mono disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-semibold uppercase px-1 pb-1 border-b border-[var(--border-color)]">
            <span>RECENT COMMITS ({commitLog.length})</span>
            <button
              onClick={() => setIsLogOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Back to Changes
            </button>
          </div>

          {commitLog.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-xs">No commits found.</div>
          ) : (
            commitLog.map((log) => (
              <div
                key={log.hash}
                className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] space-y-1 transition-colors group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-[var(--bg-panel)] text-[var(--accent-cyan)] px-1.5 py-0.5 rounded font-bold border border-[var(--border-color)]">
                    {log.shortHash}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{log.date}</span>
                </div>
                <p className="text-[var(--text-primary)] text-[11px] leading-tight font-medium">
                  {log.message}
                </p>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
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
            <div className="space-y-1 bg-rose-500/10 rounded-lg p-1.5 border border-rose-500/30">
              <div 
                onClick={() => setIsConflictsOpen(!isConflictsOpen)}
                className="flex justify-between items-center text-[10px] text-rose-500 font-semibold uppercase px-1 cursor-pointer"
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
              className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold uppercase px-1 py-1 hover:bg-[var(--bg-hover)] rounded cursor-pointer group"
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
                    className="p-0.5 hover:text-amber-500 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {isStagedOpen && (
              <div className="space-y-0.5">
                {stagedList.length === 0 ? (
                  <div className="text-[10px] text-[var(--text-subtle)] px-3 py-1 italic">
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
              className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold uppercase px-1 py-1 hover:bg-[var(--bg-hover)] rounded cursor-pointer group"
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
                    className="p-0.5 hover:text-rose-500 transition-colors"
                  >
                    <Undo2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stageAll();
                    }}
                    title="Stage All Changes"
                    className="p-0.5 hover:text-emerald-500 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {isUnstagedOpen && (
              <div className="space-y-0.5">
                {unstagedList.length === 0 ? (
                  <div className="text-[10px] text-[var(--text-subtle)] px-3 py-1 italic">
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
                className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold uppercase px-1 py-1 hover:bg-[var(--bg-hover)] rounded cursor-pointer group"
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
                    className="p-0.5 hover:text-emerald-500 transition-colors"
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
            <div className="p-6 text-center text-[var(--text-muted)] font-mono text-xs flex flex-col items-center justify-center space-y-2">
              <Check className="w-8 h-8 text-emerald-500/70" />
              <p className="text-[var(--text-primary)] font-medium">Working tree is clean</p>
              <p className="text-[11px] text-[var(--text-subtle)]">No pending changes in this repository.</p>
            </div>
          )}
        </div>
      )}

      {/* Branch Switcher Modal Popover */}
      {showBranchModal && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex flex-col font-mono text-xs animate-in fade-in duration-150"
          onClick={() => setShowBranchModal(false)}
        >
          <div 
            className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-3 shadow-2xl flex flex-col max-h-[85%] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] mb-2 text-[var(--text-primary)] font-bold">
              <div className="flex items-center space-x-1.5">
                <GitBranch className="w-4 h-4 text-[var(--accent-coral)]" />
                <span>Switch / Create Branch</span>
              </div>
              <button onClick={() => setShowBranchModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Branch Input */}
            <div className="space-y-1 mb-3">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Create New Branch</span>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="new-branch-name..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-coral)] shadow-sm"
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
                  className="px-2.5 py-1 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white rounded text-xs font-semibold disabled:opacity-40 shadow-sm cursor-pointer"
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
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)] mb-2 focus:outline-none focus:border-[var(--accent-cyan)] shadow-sm"
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
                        ? 'bg-[var(--accent-coral)]/15 text-[var(--accent-coral)] font-bold border border-[var(--accent-coral)]/40 shadow-sm'
                        : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <GitBranch className={`w-3.5 h-3.5 ${b.isCurrent ? 'text-[var(--accent-coral)]' : 'text-[var(--text-subtle)]'}`} />
                      <span className="truncate">{b.name}</span>
                    </div>

                    {b.isCurrent && (
                      <span className="text-[10px] text-[var(--accent-coral)] font-bold">CURRENT</span>
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
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex flex-col font-mono text-xs animate-in fade-in duration-150"
          onClick={() => setShowAddRemoteModal(false)}
        >
          <div 
            className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-3 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] text-[var(--text-primary)] font-bold">
              <div className="flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-[var(--accent-cyan)]" />
                <span>Add Git Remote</span>
              </div>
              <button onClick={() => setShowAddRemoteModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">Remote Name</label>
              <input
                type="text"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                placeholder="origin"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] shadow-sm"
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-muted)] block mb-1">Remote Repository URL</label>
              <input
                type="text"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] shadow-sm"
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
              className="w-full py-1.5 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-hover)] text-white font-semibold rounded transition-colors disabled:opacity-40 shadow-sm cursor-pointer"
            >
              Add Remote
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
