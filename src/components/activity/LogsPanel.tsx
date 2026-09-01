import React, { useState } from 'react';
import { FileText, Search, Trash2, Filter } from 'lucide-react';

export const LogsPanel: React.FC = () => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([
    { id: '1', level: 'INFO', time: '19:40:12', msg: 'FastAPI Uvicorn server started on http://0.0.0.0:8000' },
    { id: '2', level: 'INFO', time: '19:40:14', msg: 'WebSocket terminal stream connected from client (127.0.0.1)' },
    { id: '3', level: 'WARN', time: '19:41:02', msg: 'High memory load detected on GPU 2 (PyTorch model training)' },
    { id: '4', level: 'ERROR', time: '19:42:15', msg: 'Unused import statement "HTTPException" in backend/server.py' },
    { id: '5', level: 'INFO', time: '19:43:00', msg: 'File written to disk: c:/.../backend/server.js' },
  ]);

  const filtered = logs.filter(l => 
    (filterLevel === 'ALL' || l.level === filterLevel) &&
    (query === '' || l.msg.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
      <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider bg-[var(--bg-panel)]">
        <span>SYSTEM LOGS STREAM</span>
        <button onClick={() => setLogs([])} title="Clear Logs" className="p-1 hover:text-[var(--text-primary)] transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-rose-500" />
        </button>
      </div>

      <div className="p-2 space-y-2 border-b border-[var(--border-color)]">
        {/* Search Input Box */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter log stream..."
            className="w-full h-7 bg-[var(--bg-input)] border border-[var(--border-color)] rounded pl-7 pr-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] font-mono shadow-sm"
          />
          <Search className="w-3 h-3 text-[var(--text-muted)] absolute left-2" />
        </div>

        {/* Log Level Filter Chips */}
        <div className="flex items-center space-x-1 font-mono text-[10px]">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded transition-colors ${
                filterLevel === lvl 
                  ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] font-bold border border-[var(--accent-cyan)]/40 shadow-sm' 
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-primary)]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Stream List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px]">
        {filtered.map((l) => (
          <div key={l.id} className="p-1.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] space-y-0.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-[9px]">
              <span className={`font-bold ${
                l.level === 'ERROR' ? 'text-rose-500' : l.level === 'WARN' ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                [{l.level}]
              </span>
              <span className="text-[var(--text-subtle)]">{l.time}</span>
            </div>
            <p className="text-[var(--text-secondary)] break-words">{l.msg}</p>
          </div>
        ))}
      </div>
    </aside>
  );
};
