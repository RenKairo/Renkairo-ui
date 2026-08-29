import React, { useState, useEffect } from 'react';
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
  Edit2
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { FileNode } from '../../types/ide';
import { performNodeAction } from '../../services/api';

const getFileIcon = (filename: string) => {
  if (filename.endsWith('.py')) return <span className="text-[#38BDF8] font-bold text-[10px]">🐍</span>;
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <span className="text-blue-400 font-bold text-[10px]">TS</span>;
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <span className="text-amber-400 font-bold text-[10px]">JS</span>;
  if (filename.endsWith('.json')) return <span className="text-yellow-300 font-bold text-[10px]">{'{ }'}</span>;
  if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return <span className="text-[#FF4D4D] font-bold text-[10px]">⚙</span>;
  if (filename.endsWith('.md')) return <span className="text-sky-300 font-bold text-[10px]">M↓</span>;
  if (filename === 'Dockerfile') return <span className="text-cyan-400 font-bold text-[10px]">🐳</span>;
  if (filename.startsWith('.env')) return <span className="text-emerald-400 font-bold text-[10px]">ENV</span>;
  return <FileCode className="w-3.5 h-3.5 text-gray-400" />;
};

interface DirectoryTreeItemProps {
  node: FileNode;
  level: number;
}

const DirectoryTreeItem: React.FC<DirectoryTreeItemProps> = ({ node, level }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const { openFile, selectedPath, setSelectedPath, loadTree } = useIDEStore();

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPath(node.path);
    if (node.is_dir) {
      setIsOpen(!isOpen);
    } else {
      openFile(node.path, node.name);
    }
  };

  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        onClick={handleSelect}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={`flex items-center space-x-1.5 py-1 pr-2 rounded text-xs cursor-pointer select-none group transition-colors ${
          isSelected ? 'bg-[#181B24] text-white border-l-2 border-[#FF4D4D]' : 'text-gray-300 hover:bg-[#12151C]'
        }`}
      >
        {node.is_dir ? (
          <>
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            )}
          </>
        ) : (
          <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 ml-3.5">
            {getFileIcon(node.name)}
          </div>
        )}

        <span className="truncate font-mono text-[11px]">{node.name}</span>

        {/* Git Status Badge */}
        {node.gitStatus && (
          <span
            className={`ml-auto text-[9px] font-mono font-bold px-1 rounded ${
              node.gitStatus === 'M'
                ? 'text-amber-400'
                : node.gitStatus === 'U'
                ? 'text-emerald-400'
                : 'text-gray-400'
            }`}
          >
            {node.gitStatus}
          </span>
        )}
      </div>

      {node.is_dir && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <DirectoryTreeItem key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC = () => {
  const { fileTree, rootName, loadTree, selectedPath } = useIDEStore();

  useEffect(() => {
    loadTree();
  }, []);

  const handleCreateFile = async () => {
    const fileName = typeof window.prompt === 'function' ? window.prompt('Enter new file name:') : 'new_file.txt';
    if (!fileName) return;
    const targetPath = selectedPath ? `${selectedPath}/${fileName}` : fileName;
    await performNodeAction('create_file', targetPath);
    await loadTree();
  };

  const handleCreateFolder = async () => {
    const folderName = typeof window.prompt === 'function' ? window.prompt('Enter new folder name:') : 'new_folder';
    if (!folderName) return;
    const targetPath = selectedPath ? `${selectedPath}/${folderName}` : folderName;
    await performNodeAction('create_dir', targetPath);
    await loadTree();
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    const confirmDelete = typeof window.confirm === 'function' ? window.confirm(`Delete ${selectedPath}?`) : true;
    if (confirmDelete) {
      await performNodeAction('delete', selectedPath);
      await loadTree();
    }
  };

  return (
    <aside className="w-64 bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10">
      {/* Header Bar */}
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>EXPLORER</span>
        <div className="flex items-center space-x-1">
          <button onClick={handleCreateFile} title="New File" className="p-1 hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCreateFolder} title="New Folder" className="p-1 hover:text-white transition-colors">
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} title="Delete Selected" className="p-1 hover:text-rose-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => loadTree()} title="Refresh Explorer" className="p-1 hover:text-white transition-colors">
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Root Workspace Title */}
      <div className="px-3 py-2 flex items-center space-x-1.5 text-xs font-bold text-gray-200 uppercase tracking-wide border-b border-[#232734]/40 bg-[#12151C]/40">
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-mono">{rootName}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] ml-auto"></span>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {fileTree.map((node) => (
          <DirectoryTreeItem key={node.path} node={node} level={0} />
        ))}
      </div>
    </aside>
  );
};
