import React, { useEffect } from 'react';
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
  const { activeActivity } = useIDEStore();

  useEffect(() => {
    fileWatcher.init();
  }, []);

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
    <div className="h-screen w-screen flex flex-col bg-[#0B0D11] text-[#E2E8F0] overflow-hidden select-none font-sans">
      {/* Top Command Bar */}
      <TopCommandBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar (Far Left) */}
        <ActivityBar />

        {/* Dynamic Activity Panel */}
        {renderActivityPanel()}

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
