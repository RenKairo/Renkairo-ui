import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CaseSensitive, 
  Regex, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  FileText, 
  FileJson, 
  Loader2, 
  X, 
  RotateCcw, 
  ChevronsDown, 
  ChevronsRight 
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { searchCodebase, SearchFileResult } from '../../services/fileSystem';

function HighlightedSnippet({ text, matchIndices }: { text: string; matchIndices: [number, number][] }) {
  if (!matchIndices || matchIndices.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;

  matchIndices.forEach(([start, end], i) => {
    if (start > lastIdx) {
      parts.push(text.substring(lastIdx, start));
    }
    parts.push(
      <mark
        key={i}
        className="bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] font-bold rounded px-0.5 select-none"
      >
        {text.substring(start, end)}
      </mark>
    );
    lastIdx = end;
  });

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return <span>{parts}</span>;
}

function getFileIcon(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.js') || lower.endsWith('.jsx')) {
    return <FileCode className="w-3.5 h-3.5 text-[var(--accent-cyan)] shrink-0" />;
  }
  if (lower.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (lower.endsWith('.css') || lower.endsWith('.html') || lower.endsWith('.scss')) {
    return <FileCode className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  }
  return <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />;
}

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [includes, setIncludes] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchFileResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [capped, setCapped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  const { openFile, workspacePath } = useIDEStore();

  // Debounced Search Engine Dispatcher (250ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotalMatches(0);
      setTotalFiles(0);
      setCapped(false);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchCodebase({
          query,
          includes,
          isCaseSensitive,
          isWholeWord,
          isRegex
        });

        if (res.error) {
          setError(res.error);
          setResults([]);
          setTotalMatches(0);
          setTotalFiles(0);
          setCapped(false);
        } else {
          setError(null);
          setResults(res.results || []);
          setTotalMatches(res.totalMatches || 0);
          setTotalFiles(res.totalFiles || 0);
          setCapped(!!res.capped);
        }
      } catch (err: any) {
        setError(err.message || 'Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, includes, isCaseSensitive, isWholeWord, isRegex, workspacePath]);

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleCollapseAll = () => {
    const nextState = !allCollapsed;
    setAllCollapsed(nextState);
    const updated: Record<string, boolean> = {};
    results.forEach((r) => {
      updated[r.path] = nextState;
    });
    setCollapsedFiles(updated);
  };

  const clearSearch = () => {
    setQuery('');
    setIncludes('');
    setResults([]);
    setTotalMatches(0);
    setTotalFiles(0);
    setCapped(false);
    setError(null);
  };

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
      {/* Header Bar */}
      <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider shrink-0 bg-[var(--bg-panel)]">
        <span>SEARCH CODEBASE</span>
        <div className="flex items-center space-x-1">
          {results.length > 0 && (
            <button
              onClick={toggleCollapseAll}
              title={allCollapsed ? 'Expand All Files' : 'Collapse All Files'}
              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {allCollapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {(query || includes || results.length > 0) && (
            <button
              onClick={clearSearch}
              title="Clear Search"
              className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-rose-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Input Controls */}
      <div className="p-3 space-y-2.5 border-b border-[var(--border-color)] shrink-0">
        {/* Main Search Input */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in files..."
            className="w-full h-8 bg-[var(--bg-input)] border border-[var(--border-color)] rounded pl-8 pr-20 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] font-mono shadow-sm"
          />
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 pointer-events-none" />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-16 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Clear Input"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Toggle Buttons */}
          <div className="absolute right-1.5 flex items-center space-x-0.5">
            <button
              onClick={() => setIsCaseSensitive(!isCaseSensitive)}
              title="Match Case (Aa)"
              className={`p-1 rounded text-[10px] font-mono font-bold transition-all ${
                isCaseSensitive 
                  ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsWholeWord(!isWholeWord)}
              title="Match Whole Word (\b)"
              className={`px-1 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                isWholeWord 
                  ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              \b
            </button>

            <button
              onClick={() => setIsRegex(!isRegex)}
              title="Use Regular Expression (.*)"
              className={`p-1 rounded text-[10px] font-mono font-bold transition-all ${
                isRegex 
                  ? 'bg-[var(--accent-coral)]/20 text-[var(--accent-coral)] border border-[var(--accent-coral)]/40 shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Files to Include Filter */}
        <div className="flex items-center space-x-1.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 focus-within:border-[var(--accent-cyan)] shadow-sm">
          <Filter className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={includes}
            onChange={(e) => setIncludes(e.target.value)}
            placeholder="files to include (*.py, *.ts)"
            className="w-full h-6 bg-transparent text-[10px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none font-mono"
          />
          {includes && (
            <button onClick={() => setIncludes('')} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results & Status Bar */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono">
        {/* Status / Loading / Error Indicators */}
        {error ? (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-500 text-xs font-sans">
            <span className="font-bold">Error:</span> {error}
          </div>
        ) : isSearching ? (
          <div className="p-3 flex items-center justify-center space-x-2 text-xs text-[var(--accent-cyan)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Searching codebase...</span>
          </div>
        ) : !query.trim() ? (
          <div className="p-4 text-center text-xs text-[var(--text-muted)] font-sans">
            Type a query to search across files in the active workspace.
          </div>
        ) : (
          <div className="text-[11px] text-[var(--text-muted)] font-semibold px-1 py-1 flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <span>
              {totalMatches} result{totalMatches === 1 ? '' : 's'} in {totalFiles} file{totalFiles === 1 ? '' : 's'}
            </span>
            {capped && (
              <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                Capped at 500
              </span>
            )}
          </div>
        )}

        {/* Empty State */}
        {query.trim() && !isSearching && !error && results.length === 0 && (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] font-sans">
            No results found for "<span className="text-[var(--text-primary)] font-mono">{query}</span>"
          </div>
        )}

        {/* Collapsible File List Tree-View */}
        {!isSearching && results.map((result) => {
          const isCollapsed = !!collapsedFiles[result.path];
          const fileName = result.path.split(/[/\\]/).pop() || result.path;

          return (
            <div key={result.path} className="space-y-1">
              {/* File Node Header */}
              <button
                onClick={() => toggleFileCollapse(result.path)}
                className="w-full text-left flex items-center justify-between p-1.5 rounded hover:bg-[var(--bg-hover)] text-xs text-[var(--text-primary)] transition-colors group border border-transparent hover:border-[var(--border-color)]"
              >
                <div className="flex items-center space-x-1.5 overflow-hidden pr-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                  {getFileIcon(result.path)}
                  <span className="truncate font-semibold text-[var(--text-primary)] text-[11px]" title={result.path}>
                    {result.path}
                  </span>
                </div>

                <span className="text-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-cyan)] font-bold px-1.5 py-0.5 rounded shrink-0 shadow-sm">
                  {result.matches.length}
                </span>
              </button>

              {/* Matches List */}
              {!isCollapsed && (
                <div className="pl-4 space-y-0.5 border-l border-[var(--border-color)] ml-2.5">
                  {result.matches.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => openFile(result.path, fileName, m.line)}
                      className="w-full text-left p-1 rounded hover:bg-[var(--bg-hover)] text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-start space-x-2 transition-colors border border-transparent hover:border-[var(--border-color)] group"
                    >
                      <span className="text-[var(--text-subtle)] text-[10px] shrink-0 font-mono w-7 text-right group-hover:text-[var(--accent-cyan)]">
                        {m.line}:
                      </span>
                      <div className="truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] flex-1 leading-tight">
                        <HighlightedSnippet text={m.text} matchIndices={m.matchIndices} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
