import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Folder,
  FolderOpen,
  FileCode,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  HardDrive,
  Clock,
  Sparkles,
  X,
  Edit2,
  Check,
  Radio,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useAuthStore } from '../../store/authStore';
import { getBackendBaseUrl } from '../../services/apiConfig';

interface RemoteFileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension: string;
  modifiedAt?: string;
}

export const ServerFilesPanel: React.FC = () => {
  const {
    isRemoteServerConnected,
    remoteServerUrl,
    remoteServerName,
    setConnectServerModalOpen,
    openRemoteFile
  } = useIDEStore();

  const { user } = useAuthStore();

  // Dynamic Workspace ID with persistence
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('renkairo_active_workspace_id');
      if (saved) return saved;
      const storedUser = localStorage.getItem('renkairo_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.userId) return parsed.userId;
      }
    } catch {}
    return 'usr_b1860126';
  });

  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [tempWorkspaceId, setTempWorkspaceId] = useState(activeWorkspaceId);

  // Sync with auth store if user logs in
  useEffect(() => {
    if (user?.userId && user.userId !== activeWorkspaceId) {
      setActiveWorkspaceId(user.userId);
      setTempWorkspaceId(user.userId);
      localStorage.setItem('renkairo_active_workspace_id', user.userId);
    }
  }, [user?.userId]);

  const [currentSubpath, setCurrentSubpath] = useState<string>('');
  const [files, setFiles] = useState<RemoteFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openingFilePath, setOpeningFilePath] = useState<string | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<'online' | 'offline' | 'checking'>('checking');

  const backendBase = remoteServerUrl || getBackendBaseUrl();

  const fetchRemoteDirectory = async (subpath: string = '', targetWs?: string) => {
    const ws = targetWs || activeWorkspaceId;
    setIsLoading(true);
    setError(null);
    setConnectionHealth('checking');

    try {
      // 1. Try Shiro backend direct workspace endpoint
      const targetUrl = `${backendBase.replace(/\/+$/, '')}/workspace/${ws}/files?path=${encodeURIComponent(subpath)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(targetUrl, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setCurrentSubpath(subpath);
        setConnectionHealth('online');
        setIsLoading(false);
        return;
      }

      // 2. Fallback to local RenKairo backend proxy
      const apiBase = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api';
      const proxyRes = await fetch(
        `${apiBase}/remote/fs/tree?workspaceId=${encodeURIComponent(ws)}&subpath=${encodeURIComponent(subpath)}&serverUrl=${encodeURIComponent(backendBase)}`
      ).catch(() => null);

      if (proxyRes && proxyRes.ok) {
        const proxyData = await proxyRes.json();
        setFiles(proxyData.files || []);
        setCurrentSubpath(subpath);
        setConnectionHealth('online');
      } else {
        setConnectionHealth('offline');
        setError(`Cannot reach remote server at ${backendBase}. Connection timed out or server is offline.`);
      }
    } catch (err: any) {
      setConnectionHealth('offline');
      setError(err.message || 'Failed to fetch server files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemoteDirectory(currentSubpath, activeWorkspaceId);
  }, [backendBase, activeWorkspaceId]);

  const handleOpenFile = async (file: RemoteFileItem) => {
    setOpeningFilePath(file.path);
    try {
      let content = '';
      const targetUrl = `${backendBase.replace(/\/+$/, '')}/workspace/${activeWorkspaceId}/file?path=${encodeURIComponent(file.path)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(targetUrl, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        content = data.content ?? '';
      } else {
        const apiBase = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api';
        const proxyRes = await fetch(
          `${apiBase}/remote/fs/file?workspaceId=${encodeURIComponent(activeWorkspaceId)}&filePath=${encodeURIComponent(file.path)}&serverUrl=${encodeURIComponent(backendBase)}`
        ).catch(() => null);
        if (proxyRes && proxyRes.ok) {
          const proxyData = await proxyRes.json();
          content = proxyData.content ?? '';
        }
      }

      await openRemoteFile(file.path, file.name, content, file.size, activeWorkspaceId);
    } catch (err: any) {
      console.error('Failed to open remote file:', err);
    } finally {
      setOpeningFilePath(null);
    }
  };

  const handleNavigateFolder = (folderPath: string) => {
    setSearchQuery('');
    fetchRemoteDirectory(folderPath);
  };

  const handleNavigateUp = () => {
    if (!currentSubpath) return;
    const parts = currentSubpath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.join('/');
    fetchRemoteDirectory(newPath);
  };

  const handleSaveWorkspaceId = () => {
    const trimmed = tempWorkspaceId.trim() || 'usr_b1860126';
    setActiveWorkspaceId(trimmed);
    localStorage.setItem('renkairo_active_workspace_id', trimmed);
    setIsEditingWorkspace(false);
    fetchRemoteDirectory('', trimmed);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getFileIcon = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.py')) return <span className="text-[var(--accent-cyan)] font-bold text-xs">🐍</span>;
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return <span className="text-blue-400 font-bold text-[10px]">TS</span>;
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) return <span className="text-amber-400 font-bold text-[10px]">JS</span>;
    if (lower.endsWith('.json')) return <span className="text-yellow-400 font-bold text-[10px]">{'{ }'}</span>;
    if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return <span className="text-rose-400 font-bold text-[10px]">⚙</span>;
    if (lower.endsWith('.md')) return <span className="text-sky-400 font-bold text-[10px]">M↓</span>;
    if (lower.endsWith('.sh') || lower.endsWith('.bash')) return <span className="text-emerald-400 font-bold text-[10px]">&gt;_</span>;
    return <FileCode className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
  };

  // Filtered files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [files, searchQuery]);

  // Breadcrumbs
  const breadcrumbSegments = currentSubpath.split('/').filter(Boolean);

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150 overflow-hidden">
      {/* 1. Header with Server Info & Refresh */}
      <div className="p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 flex items-center justify-center">
            <Server className="w-4 h-4 text-[var(--accent-cyan)]" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
              Server Files
            </h2>
            <span className="text-[10px] text-[var(--text-muted)] truncate block max-w-[150px]">
              {remoteServerName || 'Shiro Linux Server'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => fetchRemoteDirectory(currentSubpath)}
            disabled={isLoading}
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            title="Refresh remote files"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--accent-cyan)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Connection Status & Host Bar */}
      <div className="px-3.5 py-2 border-b border-[var(--border-color)] bg-[var(--bg-base)] flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-1.5 truncate">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectionHealth === 'online'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : connectionHealth === 'checking'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-400'
            }`}
          />
          <span className="font-mono text-[var(--text-secondary)] truncate">
            {backendBase.replace(/^https?:\/\//i, '')}
          </span>
          <span
            className={`text-[9px] px-1 rounded font-semibold uppercase ${
              connectionHealth === 'online'
                ? 'text-emerald-400 bg-emerald-500/10'
                : connectionHealth === 'checking'
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-rose-400 bg-rose-500/10'
            }`}
          >
            {connectionHealth}
          </span>
        </div>
        <button
          onClick={() => setConnectServerModalOpen(true)}
          className="text-[9px] text-[var(--accent-cyan)] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium shrink-0 ml-1"
        >
          Change IP
        </button>
      </div>

      {/* 3. Dynamic Workspace Scoping Selector */}
      <div className="px-3.5 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/20 flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-1.5 text-[var(--text-muted)] truncate flex-1 mr-2">
          <HardDrive className="w-3 h-3 text-[var(--accent-cyan)] shrink-0" />
          <span className="shrink-0 text-[9px] uppercase font-bold text-[var(--text-secondary)]">Scope:</span>
          {isEditingWorkspace ? (
            <div className="flex items-center space-x-1 flex-1">
              <input
                type="text"
                value={tempWorkspaceId}
                onChange={(e) => setTempWorkspaceId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveWorkspaceId()}
                className="w-full bg-[var(--bg-base)] border border-[var(--accent-cyan)] rounded px-1.5 py-0.5 text-[10px] text-[var(--text-primary)] font-mono outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveWorkspaceId}
                className="p-1 rounded bg-[var(--accent-cyan)] text-black hover:opacity-90 cursor-pointer"
                title="Apply Workspace"
              >
                <Check className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <span className="font-mono text-[var(--accent-cyan)] font-medium truncate">
              {activeWorkspaceId}
            </span>
          )}
        </div>

        {!isEditingWorkspace && (
          <button
            onClick={() => {
              setTempWorkspaceId(activeWorkspaceId);
              setIsEditingWorkspace(true);
            }}
            className="text-[9px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-0.5 rounded hover:bg-[var(--bg-hover)]"
            title="Switch Workspace ID"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* 4. Search & Quick Filter */}
      <div className="p-2.5 border-b border-[var(--border-color)]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeWorkspaceId}...`}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-8 pr-7 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Breadcrumb Navigation Bar */}
      <div className="px-3 py-1.5 bg-[var(--bg-card)]/50 border-b border-[var(--border-color)] flex items-center text-[10px] text-[var(--text-muted)] overflow-x-auto whitespace-nowrap scrollbar-none">
        {currentSubpath && (
          <button
            onClick={handleNavigateUp}
            className="mr-1.5 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] cursor-pointer"
            title="Up one folder"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => handleNavigateFolder('')}
          className={`hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0 p-0 font-mono ${
            !currentSubpath ? 'text-[var(--accent-cyan)] font-semibold' : ''
          }`}
        >
          {activeWorkspaceId}
        </button>
        {breadcrumbSegments.map((segment, index) => {
          const segPath = breadcrumbSegments.slice(0, index + 1).join('/');
          const isLast = index === breadcrumbSegments.length - 1;
          return (
            <React.Fragment key={segPath}>
              <span className="mx-1 text-[var(--border-color)]">/</span>
              <button
                onClick={() => handleNavigateFolder(segPath)}
                className={`hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0 p-0 font-mono ${
                  isLast ? 'text-[var(--accent-cyan)] font-semibold' : ''
                }`}
              >
                {segment}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* 6. Directory Contents & Detail List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] flex flex-col space-y-2.5">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Server Connection Timed Out</span>
            </div>
            <p className="text-[10px] leading-relaxed text-rose-200/90">
              {error}
            </p>
            <div className="bg-black/30 p-2 rounded-lg font-mono text-[9px] text-[var(--text-secondary)] space-y-1">
              <div>• Ensure Arch Linux server is awake & connected to Wi-Fi</div>
              <div>• Check IP on server: <span className="text-[var(--accent-cyan)]">ip addr show</span></div>
              <div>• Check backend on server: <span className="text-[var(--accent-cyan)]">./run_server.sh</span></div>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => fetchRemoteDirectory(currentSubpath)}
                className="py-1 px-2.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Retry Connection
              </button>
              <button
                onClick={() => setConnectServerModalOpen(true)}
                className="py-1 px-2.5 rounded-md bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Change Server IP
              </button>
            </div>
          </div>
        )}

        {isLoading && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-cyan)]" />
            <span className="text-[10px]">Connecting to {activeWorkspaceId}...</span>
          </div>
        )}

        {!isLoading && filteredFiles.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-2 text-[var(--text-muted)]">
            <Folder className="w-8 h-8 opacity-40 text-[var(--accent-cyan)]" />
            <span className="text-[11px] font-medium text-[var(--text-primary)]">
              {searchQuery ? 'No matching files found' : 'Workspace is Empty'}
            </span>
            <p className="text-[10px] max-w-[200px]">
              {searchQuery
                ? 'Try a different search keyword.'
                : `Files in ~/.renkairo/workspaces/${activeWorkspaceId} will appear here.`}
            </p>
          </div>
        )}

        {filteredFiles.map((file) => {
          const isOpening = openingFilePath === file.path;

          if (file.is_dir) {
            return (
              <div
                key={file.path}
                onClick={() => handleNavigateFolder(file.path)}
                className="group flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-2 truncate">
                  <Folder className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {file.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 text-[10px] text-[var(--text-muted)]">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-base)] border border-[var(--border-color)]">
                    dir
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          }

          return (
            <div
              key={file.path}
              onClick={() => handleOpenFile(file)}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2 truncate">
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  {isOpening ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-cyan)]" />
                  ) : (
                    getFileIcon(file.name)
                  )}
                </div>
                <div className="truncate">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate block group-hover:text-[var(--accent-cyan)] transition-colors">
                    {file.name}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block font-mono">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {file.modifiedAt && (
                  <span className="text-[9px] text-[var(--text-muted)] font-mono hidden group-hover:inline">
                    {formatTimestamp(file.modifiedAt)}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFile(file);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] transition-opacity cursor-pointer"
                  title="Open in Editor"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7. Footer Summary */}
      <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-card)]/30 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
        <span>{filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}</span>
        <span className="truncate max-w-[160px]" title={`~/.renkairo/workspaces/${activeWorkspaceId}/${currentSubpath}`}>
          ~/{activeWorkspaceId}/{currentSubpath}
        </span>
      </div>
    </aside>
  );
};
