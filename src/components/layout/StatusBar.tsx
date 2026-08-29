import React from 'react';
import { 
  GitBranch, 
  RotateCw, 
  AlertCircle, 
  AlertTriangle, 
  CheckCheck,
  Terminal
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const StatusBar: React.FC = () => {
  const { cursorPos, problems } = useIDEStore();
  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  return (
    <footer className="h-6 bg-[#0B0D11] border-t border-[#232734] px-3 flex items-center justify-between text-[11px] text-gray-400 select-none z-30 font-sans">
      {/* Left: Branch & Problems Counter */}
      <div className="flex items-center space-x-4">
        {/* Branch Selector */}
        <button className="flex items-center space-x-1 hover:text-white transition-colors">
          <GitBranch className="w-3.5 h-3.5 text-[#FF4D4D]" />
          <span className="font-mono text-gray-200">main</span>
        </button>

        {/* Sync */}
        <button title="Sync Changes" className="flex items-center space-x-1 hover:text-white transition-colors">
          <RotateCw className="w-3 h-3" />
          <span>0</span>
        </button>

        {/* Problems Badges */}
        <button className="flex items-center space-x-2 hover:text-white transition-colors">
          <div className="flex items-center space-x-0.5 text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">{errorCount}</span>
          </div>
          <div className="flex items-center space-x-0.5 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-semibold">{warningCount}</span>
          </div>
        </button>
      </div>

      {/* Right: Environment & Cursor Meta */}
      <div className="flex items-center space-x-4 font-mono text-[10px]">
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span className="hidden sm:inline">Spaces: 4</span>
        <span className="hidden sm:inline">UTF-8</span>
        <span className="hidden sm:inline">LF</span>
        
        {/* Python Version Indicator */}
        <div className="flex items-center space-x-1 text-[#38BDF8]">
          <Terminal className="w-3 h-3" />
          <span>Python 3.11.6</span>
        </div>

        {/* Prettier Formatter */}
        <div className="flex items-center space-x-1 text-emerald-400">
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Prettier</span>
        </div>
      </div>
    </footer>
  );
};
