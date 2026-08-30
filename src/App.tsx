import React, { useEffect, useState } from 'react';
import { TopCommandBar } from './components/layout/TopCommandBar';
import { ActivityBar } from './components/layout/ActivityBar';
import { FileExplorer } from './components/explorer/FileExplorer';
import { SearchPanel } from './components/activity/SearchPanel';
import { SourceControlPanel } from './components/activity/SourceControlPanel';
import { RemotePanel } from './components/activity/RemotePanel';
import { DockerPanel } from './components/activity/DockerPanel';
import { CloudResourcesPanel } from './components/activity/CloudResourcesPanel';
import { LogsPanel } from './components/activity/LogsPanel';
import { TeamPanel } from './components/activity/TeamPanel';
import { SettingsPanel } from './components/activity/SettingsPanel';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { ObservabilityDeck } from './components/sidebar/ObservabilityDeck';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPaletteModal } from './components/layout/CommandPaletteModal';
import { useIDEStore } from './store/ideStore';
import { fileWatcher } from './services/fileWatcher';

export const App: React.FC = () => {
  const { 
    activeActivity, 
    leftSidebarWidth, 
    setLeftSidebarWidth, 
    rightSidebarWidth, 
    setRightSidebarWidth 
  } = useIDEStore();

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    fileWatcher.init();
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

  // Right Sidebar Drag-to-Resize Handler
  const handleRightResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = startWidth + deltaX;
      const minW = 180;
      const maxW = Math.max(minW, Math.min(window.innerWidth * 0.45, 700));
      setRightSidebarWidth(Math.min(Math.max(newWidth, minW), maxW));
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
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
      case 'remote': return <RemotePanel />;
      case 'docker': return <DockerPanel />;
      case 'resources': return <CloudResourcesPanel />;
      case 'logs': return <LogsPanel />;
      case 'team': return <TeamPanel />;
      case 'settings': return <SettingsPanel />;
      default: return <FileExplorer />;
    }
  };

  return (
    <div className={`h-screen w-screen flex flex-col bg-[#0B0D11] text-[#E2E8F0] overflow-hidden select-none font-sans ${isDraggingLeft || isDraggingRight ? 'cursor-col-resize select-none' : ''}`}>
      {/* Top Command Bar */}
      <TopCommandBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar (Far Left) */}
        <ActivityBar />

        {/* Dynamic Resizable Left Activity Panel */}
        <div 
          style={{ width: `${leftSidebarWidth}px` }} 
          className="h-full relative shrink-0 flex flex-col bg-[#0B0D11] overflow-hidden"
        >
          {renderActivityPanel()}

          {/* Left-to-Center Resize Handle */}
          <div
            onMouseDown={handleLeftResizeMouseDown}
            className="w-2 h-full absolute top-0 -right-1 z-30 cursor-col-resize flex items-center justify-center group hover:bg-[#38BDF8]/40 active:bg-[#FF4D4D]/60 transition-colors"
            title="Drag to resize left panel"
          >
            <div className="w-0.5 h-12 rounded-full bg-[#232734] group-hover:bg-[#38BDF8] group-active:bg-[#FF4D4D] transition-colors" />
          </div>
        </div>

        {/* Center Main Stage (Editor Canvas + Bottom Terminal Panel) */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden relative ${isDraggingLeft || isDraggingRight ? 'pointer-events-none' : ''}`}>
          {/* Editor Stage */}
          <EditorCanvas />

          {/* Integrated Dockable Terminal & Diagnostics Panel */}
          <TerminalPanel />
        </div>

        {/* Dynamic Resizable Right Observability & Compute Deck Sidebar */}
        <div 
          style={{ width: `${rightSidebarWidth}px` }} 
          className="h-full relative shrink-0 flex flex-col bg-[#0B0D11] overflow-hidden"
        >
          {/* Center-to-Right Resize Handle */}
          <div
            onMouseDown={handleRightResizeMouseDown}
            className="w-2 h-full absolute top-0 -left-1 z-30 cursor-col-resize flex items-center justify-center group hover:bg-[#38BDF8]/40 active:bg-[#FF4D4D]/60 transition-colors"
            title="Drag to resize right observability deck"
          >
            <div className="w-0.5 h-12 rounded-full bg-[#232734] group-hover:bg-[#38BDF8] group-active:bg-[#FF4D4D] transition-colors" />
          </div>

          <ObservabilityDeck />
        </div>
      </div>

      {/* Bottom Global Status Bar */}
      <StatusBar />

      {/* Global Command Palette Modal */}
      <CommandPaletteModal />
    </div>
  );
};

export default App;
