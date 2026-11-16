import React, { useEffect, useState } from 'react';
import { TopCommandBar } from './components/layout/TopCommandBar';
import { ActivityBar } from './components/layout/ActivityBar';
import { FileExplorer } from './components/explorer/FileExplorer';
import { SearchPanel } from './components/activity/SearchPanel';
import { SourceControlPanel } from './components/activity/SourceControlPanel';
import { TeamPanel } from './components/activity/TeamPanel';
import { SettingsPanel } from './components/activity/SettingsPanel';
import { RDTPStudioPanel } from './components/activity/RDTPStudioPanel';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPaletteModal } from './components/layout/CommandPaletteModal';
import { ConnectServerModal } from './components/common/ConnectServerModal';
import { AuthModal } from './components/common/AuthModal';
import { useIDEStore } from './store/ideStore';
import { useAuthStore } from './store/authStore';
import { fileWatcher } from './services/fileWatcher';

export const App: React.FC = () => {
  const { 
    activeActivity, 
    leftSidebarWidth, 
    setLeftSidebarWidth
  } = useIDEStore();

  const { initAuth } = useAuthStore();

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);

  useEffect(() => {
    fileWatcher.init();
    initAuth();
  }, []);

  // Left Sidebar Drag-to-Resize Handler
  const handleLeftResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = startWidth + deltaX;
      const minW = 160;
      const maxW = Math.max(minW, Math.min(window.innerWidth * 0.45, 650));
      setLeftSidebarWidth(Math.min(Math.max(newWidth, minW), maxW));
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const renderActivityPanel = () => {
    switch (activeActivity) {
      case 'explorer': return <FileExplorer />;
      case 'search': return <SearchPanel />;
      case 'git': return <SourceControlPanel />;
      case 'team': return <TeamPanel />;
      case 'rdtp': return <RDTPStudioPanel />;
      case 'settings': return <SettingsPanel />;
      default: return null;
    }
  };

  return (
    <div className={`h-screen w-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden select-none font-sans ${isDraggingLeft ? 'cursor-col-resize select-none' : ''}`}>
      {/* Top Command Bar */}
      <TopCommandBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar (Far Left) */}
        <ActivityBar />

        {/* Dynamic Resizable Left Activity Panel */}
        {activeActivity && (
          <div 
            style={{ width: `${leftSidebarWidth}px` }} 
            className="h-full relative shrink-0 flex flex-col bg-[var(--bg-base)] overflow-hidden"
          >
            {renderActivityPanel()}

            {/* Left-to-Center Resize Handle */}
            <div
              onMouseDown={handleLeftResizeMouseDown}
              className="w-2 h-full absolute top-0 -right-1 z-30 cursor-col-resize flex items-center justify-center group hover:bg-[var(--accent-coral)]/20 active:bg-[var(--accent-coral)]/40 transition-colors"
              title="Drag to resize left panel"
            >
              <div className="w-0.5 h-12 rounded-full bg-[var(--border-color)] group-hover:bg-[var(--accent-coral)] group-active:bg-[var(--accent-coral)] transition-colors" />
            </div>
          </div>
        )}

        {/* Center Main Stage (Editor Canvas + Bottom Terminal Panel) */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden relative ${isDraggingLeft ? 'pointer-events-none' : ''}`}>
          {/* Editor Stage */}
          <EditorCanvas />

          {/* Integrated Dockable Terminal & Diagnostics Panel */}
          <TerminalPanel />
        </div>
      </div>

      {/* Bottom Global Status Bar */}
      <StatusBar />

      {/* Global Command Palette Modal */}
      <CommandPaletteModal />

      {/* Global Remote SSH Connect Server Modal */}
      <ConnectServerModal />

      {/* Global User Authentication Modal */}
      <AuthModal />
    </div>
  );
};

export default App;
