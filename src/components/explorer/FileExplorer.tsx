import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  Folder, 
  FolderOpen, 
  Plus, 
  FolderPlus, 
  RotateCw, 
  Trash2,
  Edit2,
  FolderTree,
  FolderSync,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useGitStore } from '../../store/gitStore';
import { FileNode, GitStatusResult } from '../../types/ide';
import { ToriiIcon } from '../common/ToriiIcon';

function getGitFileStatus(filePath: string, gitStatus: GitStatusResult | null): string | null {
  if (!gitStatus || !gitStatus.isRepo) return null;
  const cleanPath = filePath.replace(/\\/g, '/');

  // 1. Staged
  const stagedItem = gitStatus.staged.find(s => s.path === cleanPath || s.path.endsWith('/' + cleanPath));
  if (stagedItem) return stagedItem.status;

  // 2. Unstaged
  const unstagedItem = gitStatus.unstaged.find(u => u.path === cleanPath || u.path.endsWith('/' + cleanPath));
  if (unstagedItem) return unstagedItem.status;

  // 3. Untracked
  const untrackedItem = gitStatus.untracked.find(u => u.path === cleanPath || u.path.endsWith('/' + cleanPath));
  if (untrackedItem) return 'U';

  return null;
}

const getFileIcon = (filename: string) => {
  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop() || '';
  if (['py', 'ts', 'tsx', 'js', 'jsx', 'json', 'yml', 'yaml', 'md', 'css', 'scss', 'html', 'rs', 'go', 'sql', 'java'].includes(ext)) {
    return <span className="text-[var(--text-muted)] font-bold text-[10px] uppercase">{ext.length > 3 ? ext.slice(0, 3) : ext}</span>;
  }
  return <FileCode className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
};

interface DirectoryTreeItemProps {
  node: FileNode;
  level: number;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  creatingIn: { parentPath: string; isDir: boolean } | null;
  setCreatingIn: (val: { parentPath: string; isDir: boolean } | null) => void;
  renamingPath: string | null;
  setRenamingPath: (path: string | null) => void;
}

const DirectoryTreeItem: React.FC<DirectoryTreeItemProps> = ({ 
  node, 
  level, 
  onContextMenu,
  creatingIn,
  setCreatingIn,
  renamingPath,
  setRenamingPath
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { openFile, selectedPath, setSelectedPath, createNewFile, createNewFolder, renameNode, moveNode, expandFolder } = useIDEStore();
  const { gitStatus } = useGitStore();
  const nodeGitStatus = !node.is_dir ? getGitFileStatus(node.path, gitStatus) : null;

  const [renameText, setRenameText] = useState(node.name);
  const [newChildName, setNewChildName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newChildInputRef = useRef<HTMLInputElement>(null);

  const isRenaming = renamingPath === node.path;
  const isCreatingHere = creatingIn && creatingIn.parentPath === node.path;
  const isSelected = selectedPath === node.path;

  // Focus rename input
  useEffect(() => {
    if (isRenaming) {
      setRenameText(node.name);
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus();
          const dotIdx = node.name.lastIndexOf('.');
          if (dotIdx > 0 && !node.is_dir) {
            renameInputRef.current.setSelectionRange(0, dotIdx);
          } else {
            renameInputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isRenaming, node.name, node.is_dir]);

  // Focus new child input
  useEffect(() => {
    if (isCreatingHere) {
      setIsOpen(true);
      setNewChildName('');
      setTimeout(() => {
        newChildInputRef.current?.focus();
      }, 50);
    }
  }, [isCreatingHere]);

  const handleToggleExpand = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOpen) {
      if (node.is_dir && node.children === null) {
        setIsLoadingChildren(true);
        try {
          await expandFolder(node.path);
        } finally {
          setIsLoadingChildren(false);
        }
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPath(node.path);
    if (node.is_dir) {
      await handleToggleExpand(e);
    } else {
      openFile(node.path, node.name);
    }
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renameText.trim();
    if (!trimmed || trimmed === node.name) {
      setRenamingPath(null);
      return;
    }
    await renameNode(node.path, trimmed, node.is_dir);
    setRenamingPath(null);
  };

  const handleCreateChildSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!creatingIn) return;
    const trimmed = newChildName.trim();
    if (!trimmed) {
      setCreatingIn(null);
      return;
    }
    if (creatingIn.isDir) {
      await createNewFolder(node.path, trimmed);
    } else {
      await createNewFile(node.path, trimmed);
    }
    setCreatingIn(null);
    setNewChildName('');
  };

  // Drag and Drop (Move file/folder to another folder)
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ path: node.path, isDir: node.is_dir }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!node.is_dir) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!node.is_dir) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.path && data.path !== node.path && !node.path.startsWith(data.path + '/')) {
        await moveNode(data.path, node.path, data.isDir);
      }
    } catch (err) {}
  };

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelect}
        onContextMenu={(e) => onContextMenu(e, node)}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        className={`flex items-center space-x-1.5 py-1 pr-2 rounded text-xs cursor-pointer select-none group transition-colors relative ${
          isSelected 
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-l-2 border-[var(--accent-coral)] font-medium shadow-sm' 
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        } ${isDragOver ? 'bg-[var(--accent-coral)]/15 border border-[var(--accent-coral)]' : ''}`}
      >
        {node.is_dir ? (
          <>
            <span 
              onClick={(e) => handleToggleExpand(e)} 
              className="p-0.5 hover:text-[var(--text-primary)] text-[var(--text-muted)]"
            >
              {isLoadingChildren ? (
                <Loader2 className="w-3.5 h-3.5 text-[var(--accent-coral)] animate-spin shrink-0" />
              ) : isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              )}
            </span>
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-[var(--accent-coral)] shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 opacity-80" />
            )}
          </>
        ) : (
          <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 ml-4">
            {getFileIcon(node.name)}
          </div>
        )}

        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={renameInputRef}
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onBlur={() => handleRenameSubmit()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setRenamingPath(null);
              }}
              className="w-full bg-[var(--bg-input)] border border-[var(--accent-coral)] text-[var(--text-primary)] px-1 py-0.5 rounded text-xs font-mono focus:outline-none shadow-sm"
            />
          </form>
        ) : (
          <div className="flex items-center justify-between flex-1 min-w-0 pr-1">
            <span className={`truncate font-mono text-[11px] select-none ${
              nodeGitStatus === 'M' ? 'text-amber-500 font-semibold' :
              nodeGitStatus === 'A' || nodeGitStatus === 'U' ? 'text-emerald-500 font-semibold' :
              nodeGitStatus === 'D' ? 'text-rose-500 line-through' :
              isSelected ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
            }`}>
              {node.name}
            </span>

            {nodeGitStatus && (
              <span className={`text-[9px] font-bold font-mono shrink-0 ml-1.5 ${
                nodeGitStatus === 'M' ? 'text-amber-500' :
                nodeGitStatus === 'A' ? 'text-emerald-500' :
                nodeGitStatus === 'U' ? 'text-emerald-500' :
                nodeGitStatus === 'D' ? 'text-rose-500' : 'text-[var(--text-muted)]'
              }`}>
                {nodeGitStatus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Children Directory Listing */}
      {node.is_dir && isOpen && (
        <div className="flex flex-col">
          {/* Inline Child Creation */}
          {isCreatingHere && (
            <div 
              style={{ paddingLeft: `${(level + 1) * 14 + 8}px` }} 
              className="flex items-center space-x-1.5 py-1 pr-2 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {creatingIn.isDir ? (
                <Folder className="w-3.5 h-3.5 text-[var(--accent-coral)] shrink-0" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              )}
              <form onSubmit={handleCreateChildSubmit} className="flex-1 mr-2">
                <input
                  ref={newChildInputRef}
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  onBlur={() => handleCreateChildSubmit()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setCreatingIn(null);
                  }}
                  placeholder={creatingIn.isDir ? 'Folder name...' : 'File name...'}
                  className="w-full bg-[var(--bg-input)] border border-[var(--accent-coral)] text-[var(--text-primary)] px-1 py-0.5 rounded text-xs font-mono focus:outline-none shadow-sm"
                />
              </form>
            </div>
          )}

          {node.children && node.children.map((child) => (
            <DirectoryTreeItem 
              key={child.path} 
              node={child} 
              level={level + 1} 
              onContextMenu={onContextMenu}
              creatingIn={creatingIn}
              setCreatingIn={setCreatingIn}
              renamingPath={renamingPath}
              setRenamingPath={setRenamingPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC = () => {
  const { 
    fileTree, 
    rootName, 
    workspacePath, 
    openFolder, 
    changeScopeFolder, 
    refreshTree, 
    isFolderOpening,
    selectedPath, 
    setSelectedPath,
    createNewFile,
    createNewFolder,
    deleteNode,
    moveNode
  } = useIDEStore();

  const [creatingIn, setCreatingIn] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [rootNewName, setRootNewName] = useState('');
  const rootInputRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; node: FileNode | null } | null>(null);

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Focus root new input
  useEffect(() => {
    if (creatingIn && creatingIn.parentPath === '') {
      setRootNewName('');
      setTimeout(() => {
        rootInputRef.current?.focus();
      }, 50);
    }
  }, [creatingIn]);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (node) setSelectedPath(node.path);
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, node });
  };

  const handleRootNewSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!creatingIn) return;
    const trimmed = rootNewName.trim();
    if (!trimmed) {
      setCreatingIn(null);
      return;
    }
    if (creatingIn.isDir) {
      await createNewFolder('', trimmed);
    } else {
      await createNewFile('', trimmed);
    }
    setCreatingIn(null);
    setRootNewName('');
  };

  const getTargetDir = (node: FileNode | null): string => {
    if (!node) return '';
    if (node.is_dir) return node.path;
    if (node.path.includes('/')) {
      return node.path.substring(0, node.path.lastIndexOf('/'));
    }
    return '';
  };

  // Root drop support (move to root)
  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.path) {
        await moveNode(data.path, '', data.isDir);
      }
    } catch (err) {}
  };

  return (
    <aside 
      className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 relative overflow-hidden transition-colors duration-150"
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleRootDrop}
    >
      {/* 1. Loading Animation when Folder is Opening */}
      {isFolderOpening ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-3 shadow-sm">
            <FolderOpen className="w-6 h-6 text-[var(--accent-coral)]" />
          </div>
          
          <h3 className="text-xs font-bold text-[var(--text-primary)] mb-3 font-mono tracking-wider flex items-center space-x-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-coral)]" />
            <span>OPENING...</span>
          </h3>

          <div className="w-32 h-1 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <div className="h-full bg-[var(--accent-coral)] animate-pulse w-full"></div>
          </div>
        </div>
      ) : !workspacePath ? (
        /* 2. No Folder Opened State */
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-3 shadow-sm p-2">
            <ToriiIcon color="var(--accent-coral)" className="w-7 h-7" />
          </div>
          <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3 font-mono uppercase tracking-wider">No Folder Opened</h3>
          
          <button
            onClick={openFolder}
            className="w-full py-2 bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center space-x-2 font-mono cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open Folder</span>
          </button>
        </div>
      ) : (
        /* 3. Folder Opened - Tree View */
        <>
          {/* Header Bar above root with Action Buttons */}
          <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold tracking-wider bg-[var(--bg-panel)]">
            <span className="truncate">EXPLORER</span>
            
            <div className="flex items-center space-x-1">
              {/* Change Folder Scope Button */}
              <button 
                onClick={changeScopeFolder} 
                title="Change Folder Scope / Open Another Folder" 
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center space-x-1"
              >
                <FolderSync className="w-3.5 h-3.5" />
              </button>

              {/* New File */}
              <button 
                onClick={() => setCreatingIn({ parentPath: getTargetDir(null), isDir: false })} 
                title="New File" 
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* New Folder */}
              <button 
                onClick={() => setCreatingIn({ parentPath: getTargetDir(null), isDir: true })} 
                title="New Folder" 
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>

              {/* Refresh */}
              <button 
                onClick={refreshTree} 
                title="Refresh Folder" 
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tree Listing */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {/* Root Inline Creation Form */}
            {creatingIn && creatingIn.parentPath === '' && (
              <div className="flex items-center space-x-1.5 py-1 px-2 text-xs">
                {creatingIn.isDir ? (
                  <Folder className="w-3.5 h-3.5 text-[var(--accent-coral)] shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                )}
                <form onSubmit={handleRootNewSubmit} className="flex-1">
                  <input
                    ref={rootInputRef}
                    type="text"
                    value={rootNewName}
                    onChange={(e) => setRootNewName(e.target.value)}
                    onBlur={() => handleRootNewSubmit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setCreatingIn(null);
                    }}
                    placeholder={creatingIn.isDir ? 'Folder name...' : 'File name...'}
                    className="w-full bg-[var(--bg-input)] border border-[var(--accent-coral)] text-[var(--text-primary)] px-1 py-0.5 rounded text-xs font-mono focus:outline-none shadow-sm"
                  />
                </form>
              </div>
            )}

            {fileTree.length === 0 && !creatingIn ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)] font-mono flex flex-col items-center justify-center space-y-2 mt-4">
                <p>This folder is empty.</p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCreatingIn({ parentPath: '', isDir: false })}
                    className="px-2 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] rounded border border-[var(--border-color)]"
                  >
                    + File
                  </button>
                  <button
                    onClick={() => setCreatingIn({ parentPath: '', isDir: true })}
                    className="px-2 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] rounded border border-[var(--border-color)]"
                  >
                    + Folder
                  </button>
                </div>
              </div>
            ) : (
              fileTree.map((node) => (
                <DirectoryTreeItem 
                  key={node.path} 
                  node={node} 
                  level={0} 
                  onContextMenu={handleContextMenu}
                  creatingIn={creatingIn}
                  setCreatingIn={setCreatingIn}
                  renamingPath={renamingPath}
                  setRenamingPath={setRenamingPath}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Clean Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-44 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs text-[var(--text-secondary)] select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: `${contextMenu.mouseY}px`, left: `${contextMenu.mouseX}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setCreatingIn({ parentPath: getTargetDir(contextMenu.node), isDir: false });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
            <span>New File</span>
          </button>

          <button
            onClick={() => {
              setCreatingIn({ parentPath: getTargetDir(contextMenu.node), isDir: true });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>New Folder</span>
          </button>

          {contextMenu.node && (
            <>
              <div className="border-t border-[var(--border-color)] my-1"></div>
              <button
                onClick={() => {
                  setRenamingPath(contextMenu.node!.path);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Rename (F2)</span>
              </button>

              <button
                onClick={() => {
                  const nodeToDelete = contextMenu.node!;
                  setContextMenu(null);
                  if (window.confirm(`Delete "${nodeToDelete.name}"?`)) {
                    deleteNode(nodeToDelete.path);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 flex items-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          <div className="border-t border-[var(--border-color)] my-1"></div>
          <button
            onClick={() => {
              refreshTree();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center space-x-2"
          >
            <RotateCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Refresh</span>
          </button>
        </div>
      )}
    </aside>
  );
};
