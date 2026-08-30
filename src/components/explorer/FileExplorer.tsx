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
import { FileNode } from '../../types/ide';

const getFileIcon = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.py')) return <span className="text-[#38BDF8] font-bold text-[10px]">🐍</span>;
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return <span className="text-blue-400 font-bold text-[10px]">TS</span>;
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return <span className="text-amber-400 font-bold text-[10px]">JS</span>;
  if (lower.endsWith('.json')) return <span className="text-yellow-300 font-bold text-[10px]">{'{ }'}</span>;
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return <span className="text-[#FF4D4D] font-bold text-[10px]">⚙</span>;
  if (lower.endsWith('.md')) return <span className="text-sky-300 font-bold text-[10px]">M↓</span>;
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return <span className="text-pink-400 font-bold text-[10px]">#</span>;
  if (lower.endsWith('.html')) return <span className="text-orange-400 font-bold text-[10px]">&lt;&gt;</span>;
  if (lower.endsWith('.rs')) return <span className="text-orange-500 font-bold text-[10px]">🦀</span>;
  if (lower.endsWith('.go')) return <span className="text-cyan-300 font-bold text-[10px]">GO</span>;
  if (lower.endsWith('.sql')) return <span className="text-indigo-400 font-bold text-[10px]">SQL</span>;
  if (lower.endsWith('.java')) return <span className="text-red-400 font-bold text-[10px]">☕</span>;
  if (lower === 'dockerfile' || lower.endsWith('.dockerfile')) return <span className="text-cyan-400 font-bold text-[10px]">🐳</span>;
  if (lower.startsWith('.env')) return <span className="text-emerald-400 font-bold text-[10px]">ENV</span>;
  return <FileCode className="w-3.5 h-3.5 text-gray-400" />;
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
            ? 'bg-[#181B24] text-white border-l-2 border-[#FF4D4D]' 
            : 'text-gray-300 hover:bg-[#12151C] hover:text-white'
        } ${isDragOver ? 'bg-[#38BDF8]/20 border border-[#38BDF8]' : ''}`}
      >
        {node.is_dir ? (
          <>
            <span 
              onClick={(e) => handleToggleExpand(e)} 
              className="p-0.5 hover:text-white text-gray-400"
            >
              {isLoadingChildren ? (
                <Loader2 className="w-3.5 h-3.5 text-[#38BDF8] animate-spin shrink-0" />
              ) : isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
            </span>
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-sky-500 shrink-0" />
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
              className="w-full bg-[#0B0D11] border border-[#38BDF8] text-white px-1 py-0.5 rounded text-xs font-mono focus:outline-none"
            />
          </form>
        ) : (
          <span className="truncate font-mono text-[11px] select-none">{node.name}</span>
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
                <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
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
                  className="w-full bg-[#0B0D11] border border-emerald-400 text-white px-1 py-0.5 rounded text-xs font-mono focus:outline-none"
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
      className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 relative overflow-hidden"
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleRootDrop}
    >
      {/* 1. Loading Animation when Folder is Opening */}
      {isFolderOpening ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#12151C] border border-[#38BDF8]/40 flex items-center justify-center shadow-lg shadow-[#38BDF8]/10 animate-pulse">
              <FolderOpen className="w-7 h-7 text-[#38BDF8] animate-bounce" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#38BDF8] via-[#FF4D4D] to-[#38BDF8] opacity-30 blur-md animate-spin"></div>
          </div>
          
          <h3 className="text-xs font-bold text-white mb-1.5 font-mono tracking-wider flex items-center space-x-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
            <span>OPENING FOLDER...</span>
          </h3>
          <p className="text-[10px] text-gray-400 font-mono max-w-[180px] leading-relaxed">
            Reading directory structure and mapping files...
          </p>

          <div className="w-36 h-1 bg-[#181B24] rounded-full overflow-hidden mt-4 border border-[#232734]">
            <div className="h-full bg-gradient-to-r from-[#38BDF8] to-[#FF4D4D] animate-pulse w-full"></div>
          </div>
        </div>
      ) : !workspacePath ? (
        /* 2. No Folder Opened State */
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <FolderTree className="w-10 h-10 text-gray-600 mb-3" />
          <h3 className="text-xs font-semibold text-gray-300 mb-1 font-mono uppercase tracking-wider">No Folder Opened</h3>
          <p className="text-[11px] text-gray-500 mb-4">Open a folder from your computer to start editing and creating files.</p>
          
          <button
            onClick={openFolder}
            className="w-full py-2 bg-[#FF4D4D] hover:bg-[#FF6666] text-white font-semibold text-xs rounded-lg transition-all shadow-md flex items-center justify-center space-x-2 font-mono group"
          >
            <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Open Folder</span>
          </button>
        </div>
      ) : (
        /* 3. Folder Opened - Tree View */
        <>
          {/* Header Bar above root with Action Buttons */}
          <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold tracking-wider bg-[#0B0D11]">
            <span className="truncate">EXPLORER</span>
            
            <div className="flex items-center space-x-1">
              {/* Change Folder Scope Button */}
              <button 
                onClick={changeScopeFolder} 
                title="Change Folder Scope / Open Another Folder" 
                className="p-1 text-sky-400 hover:text-white hover:bg-[#181B24] rounded transition-colors flex items-center space-x-1"
              >
                <FolderSync className="w-3.5 h-3.5" />
              </button>

              {/* New File */}
              <button 
                onClick={() => setCreatingIn({ parentPath: getTargetDir(null), isDir: false })} 
                title="New File" 
                className="p-1 hover:text-white hover:bg-[#181B24] rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-gray-300" />
              </button>

              {/* New Folder */}
              <button 
                onClick={() => setCreatingIn({ parentPath: getTargetDir(null), isDir: true })} 
                title="New Folder" 
                className="p-1 hover:text-white hover:bg-[#181B24] rounded transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-gray-300" />
              </button>

              {/* Refresh */}
              <button 
                onClick={refreshTree} 
                title="Refresh Folder" 
                className="p-1 hover:text-white hover:bg-[#181B24] rounded transition-colors"
              >
                <RotateCw className="w-3 h-3 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Root Folder Bar */}
          <div 
            onClick={() => setSelectedPath(null)}
            className="px-3 py-2 flex items-center justify-between text-xs font-bold text-gray-200 uppercase tracking-wide border-b border-[#232734]/40 bg-[#12151C]/60 group"
          >
            <div className="flex items-center space-x-1.5 overflow-hidden">
              <FolderOpen className="w-3.5 h-3.5 text-[#FF4D4D] shrink-0" />
              <span className="font-mono truncate">{rootName}</span>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); changeScopeFolder(); }}
              title="Switch to another folder"
              className="text-[10px] text-gray-400 hover:text-[#38BDF8] lowercase font-mono opacity-80 group-hover:opacity-100 transition-opacity"
            >
              change
            </button>
          </div>

          {/* Tree Listing */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {/* Root Inline Creation Form */}
            {creatingIn && creatingIn.parentPath === '' && (
              <div className="flex items-center space-x-1.5 py-1 px-2 text-xs">
                {creatingIn.isDir ? (
                  <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
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
                    className="w-full bg-[#0B0D11] border border-emerald-400 text-white px-1 py-0.5 rounded text-xs font-mono focus:outline-none"
                  />
                </form>
              </div>
            )}

            {fileTree.length === 0 && !creatingIn ? (
              <div className="p-4 text-center text-xs text-gray-500 font-mono flex flex-col items-center justify-center space-y-2 mt-4">
                <p>This folder is empty.</p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCreatingIn({ parentPath: '', isDir: false })}
                    className="px-2 py-1 bg-[#181B24] hover:bg-[#232734] text-xs text-gray-300 rounded"
                  >
                    + File
                  </button>
                  <button
                    onClick={() => setCreatingIn({ parentPath: '', isDir: true })}
                    className="px-2 py-1 bg-[#181B24] hover:bg-[#232734] text-xs text-gray-300 rounded"
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
          className="fixed z-50 w-44 bg-[#12151C] border border-[#232734] rounded-lg shadow-2xl py-1 text-xs text-gray-300 select-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: `${contextMenu.mouseY}px`, left: `${contextMenu.mouseX}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setCreatingIn({ parentPath: getTargetDir(contextMenu.node), isDir: false });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
          >
            <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>New File</span>
          </button>

          <button
            onClick={() => {
              setCreatingIn({ parentPath: getTargetDir(contextMenu.node), isDir: true });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Folder</span>
          </button>

          {contextMenu.node && (
            <>
              <div className="border-t border-[#232734] my-1"></div>
              <button
                onClick={() => {
                  setRenamingPath(contextMenu.node!.path);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
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
                className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 flex items-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          <div className="border-t border-[#232734] my-1"></div>
          <button
            onClick={() => {
              refreshTree();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#181B24] hover:text-white flex items-center space-x-2"
          >
            <RotateCw className="w-3.5 h-3.5 text-gray-400" />
            <span>Refresh</span>
          </button>
        </div>
      )}
    </aside>
  );
};
