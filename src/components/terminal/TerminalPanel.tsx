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
  Minimize2,
  X, 
  FolderTree,
  Check
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { TerminalTab } from '../../types/ide';

interface SessionItem {
  id: string;
  name: string;
  shellType: string;
  cwd: string | null;
  compactPath?: boolean;
}

interface SessionInstance {
  term: XTerm;
  fitAddon: FitAddon;
  ws: WebSocket;
  container: HTMLDivElement;
}

export const TerminalPanel: React.FC = () => {
  const { 
    activeTerminalTab, 
    setActiveTerminalTab, 
    problems, 
    openFile,
    workspacePath,
    terminalHeight,
    setTerminalHeight,
    terminalCopyOnSelect,
    terminalCompactPath,
    setTerminalCompactPath
  } = useIDEStore();

  const [shellType, setShellType] = useState('powershell');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Copy notification pill state
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Panel container ref for ResizeObserver and height styling
  const panelRef = useRef<HTMLDivElement>(null);

  // Map of active session ID -> { term, fitAddon, ws, container }
  const sessionInstances = useRef<Map<string, SessionInstance>>(new Map());

  // Ref to hold container elements for each session
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Refs for preferences so event listeners always have latest values
  const copyOnSelectRef = useRef(terminalCopyOnSelect);
  useEffect(() => {
    copyOnSelectRef.current = terminalCopyOnSelect;
  }, [terminalCopyOnSelect]);

  const compactPathRef = useRef(terminalCompactPath);
  useEffect(() => {
    compactPathRef.current = terminalCompactPath;
  }, [terminalCompactPath]);

  // Show copied to clipboard floating notification pill
  const showCopiedToast = (message: string = 'Copied selection to clipboard!') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setCopyToast(message);
    toastTimerRef.current = setTimeout(() => {
      setCopyToast(null);
    }, 1600);
  };

  // Drag-to-resize handle logic
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(terminalHeight);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = terminalHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Dragging upward increases terminal height, dragging downward decreases it
      const deltaY = dragStartYRef.current - moveEvent.clientY;
      const newHeight = dragStartHeightRef.current + deltaY;

      // Constraints: min 36px (tab header only), max based on viewport
      const minH = 36;
      const maxH = Math.max(minH, window.innerHeight - 80);
      const clamped = Math.min(Math.max(newHeight, minH), maxH);

      setTerminalHeight(clamped);
      if (isMaximized) setIsMaximized(false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Trigger fit addon resize on active session
      setTimeout(() => {
        if (activeSessionId) {
          const inst = sessionInstances.current.get(activeSessionId);
          if (inst) {
            try {
              inst.fitAddon.fit();
              if (inst.ws.readyState === WebSocket.OPEN) {
                inst.ws.send(JSON.stringify({ type: 'resize', cols: inst.term.cols, rows: inst.term.rows }));
              }
            } catch (err) {}
          }
        }
      }, 30);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle Compact Root Path without any ugly command injection
  const toggleCompactPath = () => {
    const nextVal = !terminalCompactPath;
    setTerminalCompactPath(nextVal);
    compactPathRef.current = nextVal;

    // Cleanly re-spawn the active terminal session with the updated prompt mode
    if (activeSessionId) {
      const instance = sessionInstances.current.get(activeSessionId);
      if (instance) {
        try { instance.ws.close(); } catch (err) {}
        try { instance.term.dispose(); } catch (err) {}
        sessionInstances.current.delete(activeSessionId);
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, compactPath: nextVal } : s))
      );
    }
  };

  // Format CWD for display: root-only (Linux/macOS style) vs full path
  const getFormattedCwd = (rawCwd: string | null) => {
    if (!rawCwd) return 'Workspace';
    if (!terminalCompactPath) return rawCwd;
    const normalized = rawCwd.replace(/\\/g, '/').replace(/\/+$/, '');
    const leaf = normalized.split('/').pop() || normalized;
    return `~/${leaf}`;
  };

  // Spawn a new terminal session
  const createNewSession = (
    type: string = shellType, 
    customCwd: string | null = workspacePath,
    isCompact: boolean = terminalCompactPath
  ) => {
    const id = `term_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const count = sessions.filter((s) => s.shellType === type).length + 1;
    const labelNames: Record<string, string> = {
      powershell: 'PowerShell',
      cmd: 'CMD',
      python: 'Python',
      node: 'Node.js',
      bash: 'Bash'
    };
    const name = `${labelNames[type] || 'Terminal'} ${count}`;

    const newSession: SessionItem = {
      id,
      name,
      shellType: type,
      cwd: customCwd,
      compactPath: isCompact
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(id);
    return id;
  };

  // Close & kill a terminal session
  const closeSession = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const instance = sessionInstances.current.get(id);
    if (instance) {
      try { instance.ws.close(); } catch (err) {}
      try { instance.term.dispose(); } catch (err) {}
      sessionInstances.current.delete(id);
    }
    containerRefs.current.delete(id);

    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[remaining.length - 1].id);
        } else {
          setActiveSessionId(null);
        }
      }
      return remaining;
    });
  };

  // Auto-create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0 && activeTerminalTab === 'TERMINAL') {
      createNewSession(shellType, workspacePath, terminalCompactPath);
    }
  }, [activeTerminalTab]);

  // When workspacePath changes (user opens a new directory), automatically create a fresh terminal in that new directory
  const prevWorkspaceRef = useRef<string | null>(workspacePath);
  useEffect(() => {
    if (workspacePath && workspacePath !== prevWorkspaceRef.current) {
      prevWorkspaceRef.current = workspacePath;
      if (activeTerminalTab === 'TERMINAL') {
        createNewSession(shellType, workspacePath, terminalCompactPath);
      }
    }
  }, [workspacePath]);

  // Initialize XTerm instance for each session once its container is mounted
  useEffect(() => {
    if (activeTerminalTab !== 'TERMINAL') return;

    sessions.forEach((session) => {
      if (sessionInstances.current.has(session.id)) {
        if (session.id === activeSessionId) {
          const inst = sessionInstances.current.get(session.id);
          if (inst) {
            setTimeout(() => {
              try {
                inst.fitAddon.fit();
                if (inst.ws.readyState === WebSocket.OPEN) {
                  inst.ws.send(JSON.stringify({ type: 'resize', cols: inst.term.cols, rows: inst.term.rows }));
                }
              } catch (err) {}
            }, 50);
          }
        }
        return;
      }

      const container = containerRefs.current.get(session.id);
      if (!container) return;

      // Clean container DOM if previously used
      container.innerHTML = '';

      const term = new XTerm({
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 12,
        cursorBlink: true,
        cursorStyle: 'block',
        theme: {
          background: '#12151C',
          foreground: '#E2E8F0',
          cursor: '#FF4D4D',
          selectionBackground: 'rgba(255, 77, 77, 0.35)',
          black: '#0B0D11',
          red: '#FF4D4D',
          green: '#10B981',
          yellow: '#F59E0B',
          blue: '#38BDF8',
          magenta: '#EC4899',
          cyan: '#06B6D4',
          white: '#F8FAFC'
        }
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(container);

      // WebSocket URL with shell, cwd & compact_path query parameters
      const isFile = window.location.protocol === 'file:';
      const baseUrl = isFile
        ? 'ws://localhost:8000/api/ws/terminal'
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws/terminal`;
      
      let wsUrl = `${baseUrl}?shell=${encodeURIComponent(session.shellType)}`;
      if (session.cwd) {
        wsUrl += `&cwd=${encodeURIComponent(session.cwd)}`;
      }
      const isCompact = session.compactPath !== undefined ? session.compactPath : terminalCompactPath;
      wsUrl += `&compact_path=${isCompact ? '1' : '0'}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        try {
          fitAddon.fit();
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        } catch (e) {}
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      // Standard user input to WebSocket (handles keyboard and native paste seamlessly without duplication)
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // ⚡ Feature 1: Copy on Selection on mouse release (with floating pill notification)
      const handleContainerMouseUp = () => {
        if (!copyOnSelectRef.current) return;
        if (term.hasSelection()) {
          const selectedText = term.getSelection();
          if (selectedText && selectedText.length > 0) {
            navigator.clipboard.writeText(selectedText).then(() => {
              showCopiedToast('Copied selection to clipboard!');
            }).catch(() => {});
          }
        }
      };
      container.addEventListener('mouseup', handleContainerMouseUp);

      // ⚡ Feature 2: Smart Ctrl+C copy handler (Prevents duplicate paste & avoids unwanted SIGINT)
      term.attachCustomKeyEventHandler((arg) => {
        // Copy on Ctrl+C / Cmd+C when text is selected
        if ((arg.ctrlKey || arg.metaKey) && arg.code === 'KeyC' && arg.type === 'keydown') {
          if (term.hasSelection()) {
            const sel = term.getSelection();
            if (sel) {
              navigator.clipboard.writeText(sel).then(() => {
                showCopiedToast('Copied selection to clipboard!');
              }).catch(() => {});
            }
            return false; // prevent sending interrupt signal
          }
        }
        // Let xterm native handler manage Ctrl+V / Cmd+V paste cleanly through term.onData (no double paste)
        return true;
      });

      sessionInstances.current.set(session.id, {
        term,
        fitAddon,
        ws,
        container
      });

      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch (e) {}
      }, 50);
    });

  }, [sessions, activeSessionId, activeTerminalTab, terminalCompactPath]);

  // ResizeObserver for dynamic, real-time responsive fitting
  useEffect(() => {
    if (!panelRef.current) return;

    const ro = new ResizeObserver(() => {
      if (activeSessionId) {
        const inst = sessionInstances.current.get(activeSessionId);
        if (inst) {
          try {
            inst.fitAddon.fit();
            if (inst.ws.readyState === WebSocket.OPEN) {
              inst.ws.send(JSON.stringify({ type: 'resize', cols: inst.term.cols, rows: inst.term.rows }));
            }
          } catch (e) {}
        }
      }
    });

    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [activeSessionId]);

  // Clean up all sessions on unmount
  useEffect(() => {
    return () => {
      sessionInstances.current.forEach((inst) => {
        try { inst.ws.close(); } catch (e) {}
        try { inst.term.dispose(); } catch (e) {}
      });
      sessionInstances.current.clear();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const tabs: { id: TerminalTab; label: string; badge?: number }[] = [
    { id: 'TERMINAL', label: 'TERMINAL' },
    { id: 'PROBLEMS', label: 'PROBLEMS', badge: problems.length },
    { id: 'OUTPUT', label: 'OUTPUT' },
    { id: 'DEBUG CONSOLE', label: 'DEBUG CONSOLE' },
    { id: 'PORTS', label: 'PORTS' },
  ];

  const clearActiveTerminal = () => {
    if (activeSessionId) {
      const inst = sessionInstances.current.get(activeSessionId);
      if (inst) {
        inst.term.clear();
      }
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeSessionCwd = activeSession?.cwd || workspacePath;

  return (
    <div 
      ref={panelRef}
      style={{
        height: isMaximized ? '100%' : `${terminalHeight}px`,
        maxHeight: isMaximized ? '100%' : 'calc(100% - 40px)',
        minHeight: '36px'
      }}
      className={`bg-[#12151C] border-t border-[#232734] flex flex-col select-none z-20 relative transition-all duration-75`}
    >
      {/* ⚡ Top Drag Resize Handle */}
      <div
        onMouseDown={handleMouseDownResize}
        className="h-2 w-full -top-1 absolute left-0 right-0 z-30 cursor-row-resize flex items-center justify-center group hover:bg-[#38BDF8]/40 active:bg-[#FF4D4D]/60 transition-colors"
        title="Drag to resize terminal height"
      >
        <div className="h-0.5 w-10 rounded-full bg-[#232734] group-hover:bg-[#38BDF8] group-active:bg-[#FF4D4D] transition-colors" />
      </div>

      {/* Floating Copy Notification Toast */}
      {copyToast && (
        <div className="absolute top-10 right-4 z-50 pointer-events-none flex items-center space-x-1.5 bg-[#181B24]/95 border border-emerald-500/50 text-emerald-300 text-[11px] px-3 py-1 rounded-md shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150 font-mono">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium">{copyToast}</span>
        </div>
      )}

      {/* Header & Main Tabs */}
      <div className="h-8 bg-[#0B0D11] border-b border-[#232734] px-3 flex items-center justify-between text-xs shrink-0">
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
          {/* ⚡ Compact Root vs Full Path Toggle Button */}
          <button
            onClick={toggleCompactPath}
            title={terminalCompactPath ? "Showing Root Only (Linux/macOS style) - Click for Full Path" : "Showing Full Path - Click for Root Only (Linux/macOS style)"}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center space-x-1 ${
              terminalCompactPath 
                ? 'bg-[#38BDF8]/20 border-[#38BDF8]/60 text-[#38BDF8] shadow-sm font-semibold' 
                : 'bg-[#181B24] border-[#232734] text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            <FolderTree className={`w-3 h-3 ${terminalCompactPath ? 'text-[#38BDF8]' : 'text-gray-400'}`} />
            <span className="hidden md:inline">
              {terminalCompactPath ? 'Root Path' : 'Full Path'}
            </span>
          </button>

          {/* Shell Profile Selector Dropdown */}
          <div className="flex items-center space-x-1 bg-[#181B24] border border-[#232734] rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-300">
            <Terminal className="w-3 h-3 text-[#38BDF8]" />
            <select
              value={shellType}
              onChange={(e) => {
                const newType = e.target.value;
                setShellType(newType);
                createNewSession(newType, workspacePath, terminalCompactPath);
              }}
              className="bg-transparent text-gray-200 focus:outline-none font-mono cursor-pointer"
            >
              <option value="powershell" className="bg-[#12151C] text-white">⚙️ PowerShell</option>
              <option value="cmd" className="bg-[#12151C] text-white">💻 Command Prompt (CMD)</option>
              <option value="python" className="bg-[#12151C] text-white">🐍 Python REPL</option>
              <option value="node" className="bg-[#12151C] text-white">🟢 Node.js REPL</option>
              <option value="bash" className="bg-[#12151C] text-white">🐧 Git Bash / WSL</option>
            </select>
          </div>

          <button onClick={() => createNewSession(shellType, workspacePath, terminalCompactPath)} title="New Terminal Session" className="p-1 hover:text-white transition-colors flex items-center space-x-1">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-400 hidden sm:inline">New Terminal</span>
          </button>

          <button onClick={clearActiveTerminal} title="Clear Console" className="p-1 hover:text-white transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          
          <button onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? "Restore Height" : "Maximize Panel"} className="p-1 hover:text-white transition-colors">
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Sub-Header Bar for Active Terminal Sessions (VS Code Style) */}
      {activeTerminalTab === 'TERMINAL' && (
        <div className="h-6 bg-[#181B24]/90 border-b border-[#232734] px-2 flex items-center justify-between text-[11px] font-mono text-gray-400 select-none shrink-0">
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`px-2 py-0.5 rounded flex items-center space-x-1.5 text-[10px] cursor-pointer transition-colors border ${
                    isActive 
                      ? 'bg-[#12151C] text-[#38BDF8] border-[#38BDF8]/40 font-semibold shadow-sm' 
                      : 'bg-transparent text-gray-400 border-transparent hover:bg-[#12151C]/60 hover:text-gray-200'
                  }`}
                >
                  <Terminal className={`w-3 h-3 ${isActive ? 'text-[#38BDF8]' : 'text-gray-500'}`} />
                  <span className="truncate max-w-[120px]">{sess.name}</span>
                  <button
                    onClick={(e) => closeSession(sess.id, e)}
                    className="p-0.5 hover:text-rose-400 rounded transition-colors ml-0.5"
                    title="Kill Terminal Session"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-mono pr-1 shrink-0">
            {activeSessionId && (
              <div 
                className="flex items-center space-x-1.5 text-gray-400 font-mono"
              >
                <span className="text-gray-500">CWD:</span>
                <span className="text-[#38BDF8] font-semibold max-w-[280px] truncate" title={activeSessionCwd || 'Workspace'}>
                  {getFormattedCwd(activeSessionCwd)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Panel Content */}
      <div className={`flex-1 overflow-hidden relative p-1 ${isDragging ? 'pointer-events-none select-none' : ''}`}>
        {activeTerminalTab === 'TERMINAL' && (
          <div className="h-full w-full relative">
            {sessions.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs font-mono space-x-2">
                <span>No active terminal sessions.</span>
                <button 
                  onClick={() => createNewSession(shellType, workspacePath, terminalCompactPath)}
                  className="px-2 py-1 bg-[#181B24] hover:bg-[#232734] border border-[#232734] text-[#38BDF8] rounded text-xs"
                >
                  + Create Terminal
                </button>
              </div>
            )}
            {sessions.map((sess) => (
              <div
                key={sess.id}
                ref={(el) => {
                  if (el) containerRefs.current.set(sess.id, el);
                  else containerRefs.current.delete(sess.id);
                }}
                className={`h-full w-full bg-[#12151C] pl-2 pt-1 absolute inset-0 ${
                  sess.id === activeSessionId ? 'block z-10' : 'hidden z-0'
                }`}
              ></div>
            ))}
          </div>
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
                  <td>uvicorn (FastAPI / Express)</td>
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
