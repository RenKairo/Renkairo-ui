import React, { useState, useEffect } from 'react';
import { Search, FileCode, Terminal, Save, FolderOpen, RotateCw, Image, FolderSync } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';

export const CommandPaletteModal: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    openFile, 
    saveCurrentFile, 
    setActiveTerminalTab, 
    wallpaperOpacity, 
    setWallpaperOpacity,
    openFolder,
    changeScopeFolder,
    refreshTree,
    fileTree
  } = useIDEStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Dynamically collect files from tree for quick search
  const flattenFiles = (nodes: typeof fileTree): { path: string; name: string }[] => {
    const list: { path: string; name: string }[] = [];
    const traverse = (items: typeof fileTree) => {
      for (const item of items) {
        if (!item.is_dir) {
          list.push({ path: item.path, name: item.name });
        }
        if (item.children) traverse(item.children);
      }
    };
    traverse(nodes);
    return list;
  };

  const projectFiles = flattenFiles(fileTree).slice(0, 15);

  const fileActions = projectFiles.map((f) => ({
    id: `file_${f.path}`,
    title: f.name,
    subtitle: f.path,
    category: 'File',
    icon: FileCode,
    action: () => openFile(f.path, f.name)
  }));

  const standardActions = [
    { id: 'open_folder', title: 'File: Open Folder From Local Machine...', category: 'Workspace', icon: FolderOpen, action: () => openFolder() },
    { id: 'change_scope', title: 'File: Change Folder Scope...', category: 'Workspace', icon: FolderSync, action: () => changeScopeFolder() },
    { id: 'refresh_tree', title: 'View: Refresh File Explorer', category: 'Explorer', icon: RotateCw, action: () => refreshTree() },
    { id: 'save', title: 'File: Save Current File', category: 'Action', icon: Save, action: () => saveCurrentFile() },
    { id: 'new_terminal', title: 'Terminal: Open Terminal Session', category: 'Action', icon: Terminal, action: () => setActiveTerminalTab('TERMINAL') },
    { id: 'wallpaper_opacity', title: `Toggle Wallpaper Opacity (${wallpaperOpacity}%)`, category: 'Aesthetics', icon: Image, action: () => setWallpaperOpacity(wallpaperOpacity >= 40 ? 15 : wallpaperOpacity + 10) }
  ];

  const actions = [...standardActions, ...fileActions];
  const filtered = actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openFolder();
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, openFolder]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 select-none">
      <div 
        className="w-full max-w-xl bg-[#12151C] border border-[#232734] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-3 border-b border-[#232734] flex items-center space-x-3 bg-[#0B0D11]/60">
          <div className="w-5 h-5 rounded bg-[#181B24] border border-[#232734] flex items-center justify-center shrink-0 p-0.5">
            <ToriiIcon className="w-3.5 h-3.5 drop-shadow-[0_0_4px_rgba(255,77,77,0.5)]" />
          </div>
          <Search className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search files..."
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none font-mono"
          />
          <span className="text-[10px] bg-[#181B24] border border-[#232734] px-2 py-0.5 rounded text-gray-400 font-mono">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1 divide-y divide-[#232734]/30">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 font-mono">
              No matching files or commands found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-[#181B24] text-white border border-[#38BDF8]/30' : 'text-gray-300 hover:bg-[#181B24]/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF4D4D]' : 'text-gray-400'}`} />
                    <span className="font-mono">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D11] text-gray-400 border border-[#232734]">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2 border-t border-[#232734] bg-[#0B0D11] text-[10px] text-gray-500 flex items-center justify-between px-3 font-mono">
          <div className="flex items-center space-x-1.5 text-gray-400">
            <ToriiIcon className="w-3 h-3" />
            <span className="font-semibold text-gray-300">RenKairo Command Palette</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Navigation: <kbd className="text-gray-300">↑</kbd> <kbd className="text-gray-300">↓</kbd></span>
            <span>Execute: <kbd className="text-gray-300">↵</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};
