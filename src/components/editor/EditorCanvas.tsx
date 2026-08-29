import React from 'react';
import Editor from '@monaco-editor/react';
import { X, Plus, SplitSquareHorizontal, MoreHorizontal, ChevronRight } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const EditorCanvas: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    closeTab, 
    setActiveTabId, 
    updateTabContent, 
    setCursorPos,
    wallpaperOpacity,
    saveCurrentFile
  } = useIDEStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Parse path breadcrumb
  const breadcrumbs = activeTab ? activeTab.path.split('/') : ['backend', 'api', 'server.py'];

  return (
    <div className="flex-1 flex flex-col bg-[#0B0D11] relative overflow-hidden h-full">
      {/* Atmosphere Background Image Overlay behind Editor Canvas */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 bg-cover bg-center"
        style={{ 
          opacity: wallpaperOpacity / 100,
          backgroundImage: `url('/wallpaper.png')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D11] via-[#0B0D11]/60 to-[#0B0D11]/80"></div>
      </div>

      {/* Tab Bar Header */}
      <div className="h-9 bg-[#0B0D11] border-b border-[#232734] flex items-center justify-between px-1 select-none z-10">
        <div className="flex items-center overflow-x-auto no-scrollbar space-x-0.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`h-9 px-3 border-r border-[#232734] flex items-center space-x-2 text-xs cursor-pointer group relative transition-colors ${
                  isActive
                    ? 'bg-[#12151C] text-white font-medium border-t-2 border-t-[#FF4D4D]'
                    : 'text-gray-400 hover:bg-[#12151C]/60 hover:text-gray-200'
                }`}
              >
                {/* Active Highlight Accent */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4D4D] cyber-glow-coral"></div>
                )}

                <span className="font-mono text-[11px] truncate">{tab.title}</span>

                {/* Dirty Unsaved Changes Indicator Dot */}
                {tab.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] shrink-0"></span>
                )}

                {/* Close Tab Trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-[#232734] text-gray-500 hover:text-white transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button title="New Editor Tab" className="p-1.5 text-gray-500 hover:text-white hover:bg-[#12151C] rounded transition-colors ml-1">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Bar Actions */}
        <div className="flex items-center space-x-1 text-gray-400 pr-2">
          <button title="Split Editor" className="p-1 hover:text-white hover:bg-[#12151C] rounded transition-colors">
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
          </button>
          <button title="More Actions" className="p-1 hover:text-white hover:bg-[#12151C] rounded transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Trail */}
      <div className="h-6 bg-[#12151C]/80 border-b border-[#232734] px-4 flex items-center space-x-1.5 text-[11px] font-mono text-gray-400 select-none z-10">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span className={idx === breadcrumbs.length - 1 ? 'text-gray-200 font-semibold' : ''}>
              {crumb}
            </span>
            {idx < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3 text-gray-600" />}
          </React.Fragment>
        ))}
        {activeTab?.language === 'python' && (
          <span className="ml-2 text-[9px] bg-[#FF4D4D]/10 text-[#FF4D4D] px-1.5 py-0.5 rounded font-bold">
            FastAPI
          </span>
        )}
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 relative z-10">
        {activeTab ? (
          <Editor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            theme="vs-dark"
            onChange={(val) => updateTabContent(activeTab.id, val || '')}
            onMount={(editor) => {
              editor.onDidChangeCursorPosition((e) => {
                setCursorPos(e.position.lineNumber, e.position.column);
              });
              editor.addCommand(
                // Ctrl + S or Cmd + S to save
                2048 | 49,
                () => {
                  saveCurrentFile();
                }
              );
            }}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 12 }
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 font-mono text-xs">
            <span className="text-4xl mb-2">⛩</span>
            <span>No file selected</span>
            <span className="text-[10px] text-gray-600 mt-1">Press ⌘K to open command palette</span>
          </div>
        )}
      </div>
    </div>
  );
};
