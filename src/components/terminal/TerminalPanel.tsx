import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  Terminal, 
  AlertCircle, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Maximize2, 
  X, 
  ChevronDown 
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { TerminalTab } from '../../types/ide';

export const TerminalPanel: React.FC = () => {
  const { 
    activeTerminalTab, 
    setActiveTerminalTab, 
    problems, 
    openFile 
  } = useIDEStore();

  const terminalRef = useRef<HTMLDivElement>(null);
  const [shellType, setShellType] = useState('zsh - backend');
  const xtermInstance = useRef<XTerm | null>(null);
  const wsInstance = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (activeTerminalTab !== 'TERMINAL' || !terminalRef.current) return;

    // Initialize Xterm.js instance
    const term = new XTerm({
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      theme: {
        background: '#12151C',
        foreground: '#E2E8F0',
        cursor: '#FF4D4D',
        selectionBackground: 'rgba(255, 77, 77, 0.3)',
        black: '#0B0D11',
        red: '#FF4D4D',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#38BDF8',
        magenta: '#EC4899',
        cyan: '#06B6D4',
        white: '#F8FAFC'
      },
      cursorBlink: true,
      rows: 10
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermInstance.current = term;

    // Establish WebSocket Connection to Backend
    const isFile = window.location.protocol === 'file:';
    const wsUrl = isFile
      ? 'ws://localhost:8000/api/ws/terminal'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/terminal`;
    const ws = new WebSocket(wsUrl);
    wsInstance.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [activeTerminalTab]);

  const tabs: { id: TerminalTab; label: string; badge?: number }[] = [
    { id: 'TERMINAL', label: 'TERMINAL' },
    { id: 'PROBLEMS', label: 'PROBLEMS', badge: problems.length },
    { id: 'OUTPUT', label: 'OUTPUT' },
    { id: 'DEBUG CONSOLE', label: 'DEBUG CONSOLE' },
    { id: 'PORTS', label: 'PORTS' },
  ];

  const clearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  return (
    <div className="h-48 bg-[#12151C] border-t border-[#232734] flex flex-col select-none z-20">
      {/* Header & Tabs */}
      <div className="h-8 bg-[#0B0D11] border-b border-[#232734] px-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTerminalTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTerminalTab(tab.id)}
                className={`px-3 py-1 text-[11px] font-semibold tracking-wider transition-colors relative flex items-center space-x-1.5 focus:outline-none ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#FF4D4D] text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4D4D] cyber-glow-coral"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Terminal Controls */}
        <div className="flex items-center space-x-2 text-gray-400">
          {/* Shell Selector Dropdown */}
          <div className="flex items-center space-x-1 bg-[#181B24] border border-[#232734] rounded px-2 py-0.5 text-[10px] font-mono text-gray-300">
            <Terminal className="w-3 h-3 text-[#38BDF8]" />
            <span>{shellType}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </div>

          <button onClick={clearTerminal} title="Clear Console" className="p-1 hover:text-white transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button title="New Terminal Split" className="p-1 hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button title="Maximize Panel" className="p-1 hover:text-white transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-hidden relative p-1">
        {activeTerminalTab === 'TERMINAL' && (
          <div ref={terminalRef} className="h-full w-full bg-[#12151C] pl-2 pt-1"></div>
        )}

        {activeTerminalTab === 'PROBLEMS' && (
          <div className="h-full overflow-y-auto p-2 space-y-1 font-mono text-xs">
            {problems.map((p) => (
              <div 
                key={p.id} 
                onClick={() => openFile(p.file, p.file.split('/').pop() || p.file)}
                className="flex items-center space-x-3 p-2 rounded hover:bg-[#181B24] cursor-pointer border border-transparent hover:border-[#232734] transition-colors"
              >
                {p.severity === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="text-gray-200">{p.message}</span>
                <span className="text-gray-500 text-[10px]">{p.file}:{p.line}:{p.col}</span>
                <span className="ml-auto text-[10px] text-gray-400 bg-[#0B0D11] px-1.5 py-0.5 rounded border border-[#232734]">
                  {p.code}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTerminalTab === 'OUTPUT' && (
          <div className="h-full overflow-y-auto p-2 font-mono text-xs text-gray-300 space-y-1">
            <div className="text-emerald-400">[INFO] RenKairo backend process initialized successfully.</div>
            <div className="text-gray-400">[INFO] Watching workspace directory for modifications...</div>
            <div className="text-[#38BDF8]">[BUILD] React + Vite production bundle compiled in 420ms.</div>
          </div>
        )}

        {activeTerminalTab === 'DEBUG CONSOLE' && (
          <div className="h-full overflow-y-auto p-2 font-mono text-xs text-gray-400">
            <span>Debugger attached on port 9229. Ready for breakpoints...</span>
          </div>
        )}

        {activeTerminalTab === 'PORTS' && (
          <div className="h-full overflow-y-auto p-2 font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#232734] text-gray-500 text-[10px]">
                  <th className="py-1">PORT</th>
                  <th>PROTOCOL</th>
                  <th>PROCESS</th>
                  <th>ADDRESS</th>
                </tr>
              </thead>
              <tbody className="text-gray-300 divide-y divide-[#232734]/40">
                <tr>
                  <td className="py-1 text-[#38BDF8]">8000</td>
                  <td>HTTP / WS</td>
                  <td>uvicorn (FastAPI)</td>
                  <td>http://localhost:8000</td>
                </tr>
                <tr>
                  <td className="py-1 text-emerald-400">5173</td>
                  <td>HTTP</td>
                  <td>vite (Frontend)</td>
                  <td>http://localhost:5173</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
