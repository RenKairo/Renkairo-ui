import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { 
  X, 
  SplitSquareHorizontal, 
  MoreHorizontal, 
  ChevronRight, 
  FolderOpen, 
  FolderSync, 
  Loader2, 
  HardDrive, 
  Binary, 
  Zap, 
  AlertTriangle,
  Plus,
  Minus,
  Undo2,
  FileCode,
  Columns2,
  Rows2,
  GitBranch
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useGitStore } from '../../store/gitStore';
import { openExternalTerminal } from '../../services/api';
import { getMonacoOptionsForTier, formatFileSize } from '../../services/largeFileService';
import { ToriiIcon } from '../common/ToriiIcon';

export const EditorCanvas: React.FC = () => {
  const { 
    theme,
    tabs, 
    activeTabId, 
    targetLine, 
    closeTab, 
    setActiveTabId, 
    updateTabContent, 
    setCursorPos, 
    wallpaperOpacity, 
    saveCurrentFile, 
    setActiveTerminalTab, 
    fontSize, 
    tabSize, 
    minimapEnabled, 
    openFolder, 
    changeScopeFolder, 
    workspacePath, 
    rootName, 
    isFolderOpening, 
    fileLoadingProgress,
    openFile
  } = useIDEStore();

  const { stageFile, unstageFile, discardFile } = useGitStore();

  const [diffSideBySide, setDiffSideBySide] = useState(true);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Global Ctrl+W / Cmd+W to close active editor tab
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        const state = useIDEStore.getState();
        if (state.activeTabId) {
          e.preventDefault();
          e.stopPropagation();
          state.closeTab(state.activeTabId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const editorRef = React.useRef<any>(null);

  // Jump to line when targetLine is set
  React.useEffect(() => {
    if (editorRef.current && activeTab && targetLine && targetLine.tabId === activeTab.id) {
      try {
        editorRef.current.revealLineInCenter(targetLine.line);
        editorRef.current.setPosition({ lineNumber: targetLine.line, column: 1 });
        editorRef.current.focus();
      } catch (e) {}
    }
  }, [targetLine, activeTabId]);

  // Parse path breadcrumb
  const breadcrumbs = activeTab 
    ? [rootName.toLowerCase(), ...activeTab.path.split(/[/\\]/)]
    : [rootName.toLowerCase()];

  // Calculate tier-specific Monaco options
  const tierOptions = activeTab ? getMonacoOptionsForTier(activeTab.tier) : {};

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-panel)] relative overflow-hidden h-full transition-colors duration-150">
      {/* Background Atmosphere */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 bg-cover bg-center"
        style={{ 
          opacity: (theme === 'light' ? Math.max(wallpaperOpacity, 30) : wallpaperOpacity) / 100,
          backgroundImage: theme === 'light' ? `url('/wallpaper-light.jpeg')` : `url('/wallpaper-dark.png')`
        }}
      >
        <div className="absolute inset-0" style={{ background: 'var(--wallpaper-overlay)' }}></div>
      </div>

      {/* Tab Bar Header (Only visible if tabs exist or workspace is active) */}
      {tabs.length > 0 && (
        <div className="h-9 bg-[var(--bg-base)] border-b border-[var(--border-color)] flex items-center justify-between px-1 select-none z-10">
          <div className="flex items-center overflow-x-auto no-scrollbar space-x-0.5">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`h-9 px-3 border-r border-[var(--border-color)] flex items-center space-x-2 text-xs cursor-pointer group relative transition-colors ${
                    isActive
                      ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] font-medium border-t-2 border-t-[var(--accent-coral)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-coral)] cyber-glow-coral"></div>
                  )}

                  {tab.isDiff && (
                    <SplitSquareHorizontal className="w-3.5 h-3.5 text-[var(--accent-cyan)] shrink-0" />
                  )}

                  <span className="font-mono text-[11px] truncate">{tab.title}</span>

                  {tab.isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-coral)] shrink-0" title="Unsaved changes"></span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Tab Bar Actions */}
          <div className="flex items-center space-x-1 text-[var(--text-muted)] pr-2">
            {/* Run Code Button */}
            <button 
              onClick={() => {
                saveCurrentFile();
                setActiveTerminalTab('TERMINAL');
              }} 
              title="Run Code (Java, Python, Node, C++)" 
              className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/20 rounded flex items-center space-x-1 font-mono text-[11px] font-semibold transition-all focus:outline-none"
            >
              <span className="text-emerald-500">▶</span>
              <span>Run Code</span>
            </button>

            {/* Open Windows Terminal Button */}
            <button 
              onClick={() => openExternalTerminal()} 
              title="Open Windows Terminal App on Desktop" 
              className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)] hover:text-[var(--text-primary)] rounded flex items-center space-x-1 font-mono text-[11px] transition-all focus:outline-none"
            >
              <span>🖥️</span>
              <span className="hidden sm:inline">Windows Terminal</span>
            </button>

            <button title="Split Editor" className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors">
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
            </button>
            <button title="More Actions" className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation Trail */}
      {activeTab && !activeTab.isDiff && (
        <div className="h-6 bg-[var(--bg-panel)]/90 border-b border-[var(--border-color)] px-4 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] select-none z-10">
          <div className="flex items-center space-x-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className={idx === breadcrumbs.length - 1 ? 'text-[var(--text-primary)] font-semibold' : ''}>
                  {crumb}
                </span>
                {idx < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-subtle)]" />}
              </React.Fragment>
            ))}

            {activeTab.size !== undefined && (
              <span className="ml-2 text-[9px] bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-mono">
                {formatFileSize(activeTab.size)}
              </span>
            )}

            {activeTab.language && !activeTab.isBinary && (
              <span className="text-[9px] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] px-1.5 py-0.5 rounded font-bold uppercase font-mono">
                {activeTab.language}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Ctrl+S to save</span>
            </span>
          </div>
        </div>
      )}

      {/* Dedicated Git Diff Header Bar */}
      {activeTab && activeTab.isDiff && (
        <div className="h-8 bg-[var(--bg-panel)] border-b border-[var(--border-color)] px-4 flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] select-none z-10">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-[var(--accent-cyan)] font-semibold">
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span>DIFF</span>
            </div>

            <span className="text-[var(--text-subtle)]">|</span>

            <span className="text-[var(--text-primary)] font-semibold">{activeTab.path}</span>

            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
              activeTab.diffStaged ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
            }`}>
              {activeTab.diffStaged ? 'Staged (Index ↔ HEAD)' : 'Working Tree (Disk ↔ Index)'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Toggle Side-by-Side vs Inline */}
            <button
              onClick={() => setDiffSideBySide(!diffSideBySide)}
              title={diffSideBySide ? 'Switch to Inline Diff' : 'Switch to Side-by-Side Diff'}
              className="p-1 px-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-1 text-[10px] transition-colors"
            >
              {diffSideBySide ? <Columns2 className="w-3 h-3" /> : <Rows2 className="w-3 h-3" />}
              <span>{diffSideBySide ? 'Side-by-Side' : 'Inline'}</span>
            </button>

            {/* Stage / Unstage Action */}
            {activeTab.diffStaged ? (
              <button
                onClick={() => unstageFile(activeTab.path)}
                className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-500 rounded flex items-center space-x-1 text-[10px] font-semibold transition-colors"
              >
                <Minus className="w-3 h-3" />
                <span>Unstage</span>
              </button>
            ) : (
              <button
                onClick={() => stageFile(activeTab.path)}
                className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 rounded flex items-center space-x-1 text-[10px] font-semibold transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Stage File</span>
              </button>
            )}

            {/* Discard Changes (if unstaged) */}
            {!activeTab.diffStaged && (
              <button
                onClick={() => {
                  if (window.confirm(`Discard working tree changes to "${activeTab.path}"?`)) {
                    discardFile(activeTab.path);
                    closeTab(activeTab.id);
                  }
                }}
                className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-500 rounded flex items-center space-x-1 text-[10px] font-semibold transition-colors"
              >
                <Undo2 className="w-3 h-3" />
                <span>Discard</span>
              </button>
            )}

            {/* Open Raw File */}
            <button
              onClick={() => openFile(activeTab.path, activeTab.path.split(/[/\\]/).pop() || activeTab.path)}
              className="p-1 hover:text-[var(--text-primary)] text-[var(--text-muted)] transition-colors"
              title="Open File for Editing"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Large File & Safe Mode Notice Banner */}
      {activeTab && !activeTab.isDiff && (activeTab.tier === 'large' || activeTab.tier === 'huge' || activeTab.truncated) && (
        <div className="h-7 bg-amber-500/10 border-b border-amber-500/30 px-4 flex items-center justify-between text-[11px] font-mono text-amber-500 select-none z-10">
          <div className="flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>
              High-performance mode active ({formatFileSize(activeTab.size || 0)}). Heavy tokenizers and minimap disabled for speed.
            </span>
          </div>
          {activeTab.truncated && (
            <div className="flex items-center space-x-1 text-orange-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Viewing first 25 MB preview window</span>
            </div>
          )}
        </div>
      )}

      {/* Monaco Editor Container / Diff Editor / Home Screen / Loading Screen */}
      <div className="flex-1 relative z-10">
        {/* 1. Folder Opening Animation */}
        {isFolderOpening ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-3xl bg-[var(--bg-card)] border border-[var(--accent-cyan)]/40 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-cyan)]/20 via-[var(--accent-coral)]/10 to-transparent animate-pulse"></div>
              <FolderOpen className="w-10 h-10 text-[var(--accent-cyan)] z-10 animate-bounce" />
            </div>

            <div className="flex items-center space-x-2 mb-2 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" />
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-wider">OPENING WORKSPACE...</h2>
            </div>
            
            <p className="text-xs text-[var(--text-muted)] font-mono mb-6 max-w-sm">
              Connecting and parsing local files from your computer
            </p>

            <div className="w-48 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="h-full bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--accent-coral)] to-[var(--accent-cyan)] animate-pulse w-full"></div>
            </div>
          </div>
        ) : fileLoadingProgress ? (
          /* 2. Non-blocking Chunked Stream Progress for Large Files */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-cyan)]/40 flex items-center justify-center mb-4 shadow-xl">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
            </div>

            <h3 className="text-sm font-bold text-[var(--text-primary)] font-mono mb-1">
              STREAMING FILE ({fileLoadingProgress.percent}%)
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-mono mb-4">
              {formatFileSize(fileLoadingProgress.bytesLoaded)} / {formatFileSize(fileLoadingProgress.totalBytes)}
            </p>

            <div className="w-64 h-2 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
              <div 
                className="h-full bg-gradient-to-r from-[var(--accent-cyan)] to-emerald-400 transition-all duration-100"
                style={{ width: `${fileLoadingProgress.percent}%` }}
              ></div>
            </div>
          </div>
        ) : activeTab?.isBinary ? (
          /* 3. High-Performance Binary File Guardrail Card */
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] select-none p-6 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-4 shadow-2xl">
              <Binary className="w-8 h-8 text-[var(--accent-cyan)]" />
            </div>

            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-wide mb-1 font-mono">{activeTab.title}</h2>
            <p className="text-xs text-[var(--text-muted)] mb-2 font-mono">
              Binary file ({formatFileSize(activeTab.size || 0)})
            </p>
            <p className="text-xs text-[var(--text-secondary)] mb-6 font-mono text-center max-w-sm">
              This file contains binary data and cannot be displayed as text.
            </p>

            <button
              onClick={() => openExternalTerminal()}
              className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-xs rounded-xl transition-all flex items-center space-x-2 font-mono shadow-sm"
            >
              <span>Inspect in Terminal</span>
            </button>
          </div>
        ) : activeTab?.isDiff ? (
          /* 4. Monaco Diff Editor (VS Code Git Diff) */
          <DiffEditor
            height="100%"
            language={activeTab.language}
            original={activeTab.diffOriginal ?? ''}
            modified={activeTab.diffModified ?? ''}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              readOnly: true,
              renderSideBySide: diffSideBySide,
              fontSize: fontSize,
              minimap: { enabled: minimapEnabled },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              diffWordWrap: 'off',
              ignoreTrimWhitespace: false,
              renderIndicators: true,
            }}
          />
        ) : activeTab ? (
          /* 5. Standard Monaco Code Editor */
          <Editor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            onChange={(val) => updateTabContent(activeTab.id, val || '')}
            onMount={(editor) => {
              editorRef.current = editor;
              if (targetLine && targetLine.tabId === activeTab.id) {
                setTimeout(() => {
                  try {
                    editor.revealLineInCenter(targetLine.line);
                    editor.setPosition({ lineNumber: targetLine.line, column: 1 });
                    editor.focus();
                  } catch (e) {}
                }, 50);
              }
              editor.onDidChangeCursorPosition((e) => {
                setCursorPos(e.position.lineNumber, e.position.column);
              });
              editor.addCommand(
                // Ctrl + S or Cmd + S to save to disk
                2048 | 49,
                () => {
                  saveCurrentFile();
                }
              );
              editor.addCommand(
                // Ctrl + W or Cmd + W to close active tab
                2048 | 53,
                () => {
                  const state = useIDEStore.getState();
                  if (state.activeTabId) {
                    state.closeTab(state.activeTabId);
                  }
                }
              );
            }}
            options={{
              ...tierOptions,
              fontSize: fontSize,
              tabSize: tabSize,
              minimap: { enabled: activeTab.tier === 'small' && minimapEnabled }
            }}
          />
        ) : (
          /* 6. Empty Start State */
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] select-none p-6">
            {/* Japanese Torii Emblem */}
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-4 shadow-2xl relative overflow-hidden group p-3">
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-coral)]/20 to-transparent"></div>
              <ToriiIcon color="var(--accent-coral)" className="w-10 h-10 z-10 drop-shadow-[0_0_12px_var(--glow-coral)] group-hover:scale-105 transition-transform" />
            </div>

            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-wide mb-1 font-mono">RenKairo IDE</h2>
            <p className="text-xs text-[var(--text-muted)] mb-6 font-mono text-center">
              {workspacePath ? `Active Scope: ${rootName}` : 'No folder opened yet'}
            </p>

            {/* Simple Clean Open Folder Button */}
            {!workspacePath ? (
              <button
                onClick={openFolder}
                className="px-6 py-2.5 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-[var(--accent-coral)]/20 flex items-center space-x-2 font-mono group cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Open Folder From Local Machine</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={changeScopeFolder}
                  className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--accent-cyan)] hover:text-[var(--text-primary)] font-semibold text-xs rounded-xl transition-all flex items-center space-x-2 font-mono shadow-sm"
                >
                  <FolderSync className="w-4 h-4" />
                  <span>Change Folder Scope</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
