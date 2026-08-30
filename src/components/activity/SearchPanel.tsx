import React, { useState } from 'react';
import { Search, CaseSensitive, Regex, Filter, ChevronRight, FileCode } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const { openFile } = useIDEStore();

  const searchResults = [
    {
      file: 'backend/server.py',
      path: 'backend/server.py',
      matches: [
        { line: 12, text: 'app = FastAPI(title=settings.PROJECT_NAME)' },
        { line: 22, text: '@app.get("/health")' }
      ]
    },
    {
      file: 'backend/api/terminal.py',
      path: 'backend/api/terminal.py',
      matches: [
        { line: 9, text: '@router.websocket("/terminal")' },
        { line: 18, text: 'prompt = "(renkairo) developer@Renkairo platform %"' }
      ]
    },
    {
      file: 'frontend/src/App.tsx',
      path: 'src/App.tsx',
      matches: [
        { line: 15, text: '<TopCommandBar />' },
        { line: 24, text: '<EditorCanvas />' }
      ]
    }
  ].filter(r => 
    query.trim() === '' || 
    r.file.toLowerCase().includes(query.toLowerCase()) || 
    r.matches.some(m => m.text.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <aside className="w-64 bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>SEARCH CODEBASE</span>
      </div>

      <div className="p-3 space-y-2.5 border-b border-[#232734]">
        {/* Search Input Box */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in files..."
            className="w-full h-8 bg-[#12151C] border border-[#232734] rounded pl-8 pr-16 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#38BDF8] font-mono"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5" />
          <div className="absolute right-2 flex items-center space-x-1">
            <button
              onClick={() => setIsCaseSensitive(!isCaseSensitive)}
              title="Match Case"
              className={`p-1 rounded text-[10px] ${isCaseSensitive ? 'bg-[#38BDF8]/20 text-[#38BDF8]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <CaseSensitive className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsRegex(!isRegex)}
              title="Use Regular Expression"
              className={`p-1 rounded text-[10px] ${isRegex ? 'bg-[#FF4D4D]/20 text-[#FF4D4D]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Regex className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Files to Include/Exclude Filter */}
        <div className="flex items-center space-x-1">
          <Filter className="w-3 h-3 text-gray-500" />
          <input
            type="text"
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            placeholder="files to include (*.py, *.ts)"
            className="w-full h-6 bg-[#12151C] border border-[#232734] rounded px-2 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <div className="text-[10px] font-mono text-gray-400 font-semibold px-1">
          {searchResults.reduce((acc, r) => acc + r.matches.length, 0)} results in {searchResults.length} files
        </div>

        {searchResults.map((result) => (
          <div key={result.path} className="space-y-1">
            <div className="flex items-center space-x-1.5 text-xs text-gray-200 font-mono font-semibold px-1">
              <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
              <FileCode className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="truncate">{result.file}</span>
            </div>

            <div className="pl-5 space-y-1">
              {result.matches.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => openFile(result.path, result.file.split('/').pop() || result.file)}
                  className="w-full text-left p-1.5 rounded hover:bg-[#12151C] text-[11px] font-mono text-gray-400 hover:text-white flex items-center space-x-2 border border-transparent hover:border-[#232734] transition-colors"
                >
                  <span className="text-gray-600 text-[10px]">{m.line}:</span>
                  <span className="truncate text-gray-300">{m.text}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
