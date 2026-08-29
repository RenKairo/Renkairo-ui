import React from 'react';
import { TopCommandBar } from './components/layout/TopCommandBar';
import { ActivityBar } from './components/layout/ActivityBar';
import { FileExplorer } from './components/explorer/FileExplorer';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { ObservabilityDeck } from './components/sidebar/ObservabilityDeck';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPaletteModal } from './components/layout/CommandPaletteModal';
import { useIDEStore } from './store/ideStore';

export const App: React.FC = () => {
  const { activeActivity } = useIDEStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0D11] text-[#E2E8F0] overflow-hidden select-none font-sans">
      {/* Top Command Bar */}
      <TopCommandBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar (Far Left) */}
        <ActivityBar />

        {/* Collapsible Left Sidebar (Workspace Explorer) */}
        {activeActivity === 'explorer' && <FileExplorer />}

        {/* Center Main Stage (Editor Canvas + Bottom Terminal Panel) */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Editor Stage */}
          <EditorCanvas />

          {/* Integrated Dockable Terminal & Diagnostics Panel */}
          <TerminalPanel />
        </div>

        {/* Right Observability & Compute Deck Sidebar */}
        <ObservabilityDeck />
      </div>

      {/* Bottom Global Status Bar */}
      <StatusBar />

      {/* Global Command Palette Modal */}
      <CommandPaletteModal />
    </div>
  );
};

export default App;
