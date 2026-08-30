import React, { useState } from 'react';
import { GitBranch, GitCommit, UploadCloud, DownloadCloud, Check, RefreshCw, Plus, FileCode } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const SourceControlPanel: React.FC = () => {
  const [commitMsg, setCommitMsg] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<string[]>(['backend/requirements.txt']);
  const [unstagedFiles, setUnstagedFiles] = useState<string[]>([
    'frontend/README.md',
    'README.md',
    'package.json'
  ]);
  const { openFile } = useIDEStore();

  const handleStage = (file: string) => {
    setUnstagedFiles(unstagedFiles.filter(f => f !== file));
    setStagedFiles([...stagedFiles, file]);
  };

  const handleUnstage = (file: string) => {
    setStagedFiles(stagedFiles.filter(f => f !== file));
    setUnstagedFiles([...unstagedFiles, file]);
  };

  const handleCommit = () => {
    if (!commitMsg.trim()) {
      alert('Please enter a commit message');
      return;
    }
    setIsCommitting(true);
    setTimeout(() => {
      setIsCommitting(false);
      setStagedFiles([]);
      setCommitMsg('');
      alert(`Committed changes: "${commitMsg}"`);
    }, 600);
  };

  return (
    <aside className="w-64 bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>SOURCE CONTROL</span>
        <div className="flex items-center space-x-1">
          <button title="Refresh Status" className="p-1 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button title="Pull Changes" className="p-1 hover:text-white transition-colors">
            <DownloadCloud className="w-3.5 h-3.5 text-[#38BDF8]" />
          </button>
          <button title="Push Branch" className="p-1 hover:text-white transition-colors">
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3 border-b border-[#232734]">
        {/* Branch Info */}
        <div className="flex items-center space-x-2 text-xs font-mono text-gray-300 bg-[#12151C] p-2 rounded border border-[#232734]">
          <GitBranch className="w-4 h-4 text-[#FF4D4D]" />
          <span className="font-semibold">main</span>
          <span className="ml-auto text-[10px] text-gray-500">origin/main</span>
        </div>

        {/* Commit Message Textarea */}
        <div className="space-y-2">
          <textarea
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message (Ctrl+Enter to commit)"
            rows={3}
            className="w-full bg-[#12151C] border border-[#232734] rounded p-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#FF4D4D] font-mono resize-none"
          />

          <button
            onClick={handleCommit}
            disabled={isCommitting || (stagedFiles.length === 0 && unstagedFiles.length === 0)}
            className="w-full py-1.5 bg-[#FF4D4D] hover:bg-[#D9383A] text-white text-xs font-semibold rounded flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>{isCommitting ? 'Committing...' : 'Commit Changes'}</span>
          </button>
        </div>
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono text-xs">
        {/* Staged Changes */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase px-1">
            <span>STAGED CHANGES ({stagedFiles.length})</span>
          </div>
          {stagedFiles.map((file) => (
            <div
              key={file}
              className="flex items-center justify-between p-1.5 rounded bg-[#12151C]/60 hover:bg-[#12151C] text-gray-200 group border border-transparent hover:border-[#232734]"
            >
              <button onClick={() => openFile(file, file.split('/').pop() || file)} className="truncate flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="truncate">{file}</span>
              </button>
              <button onClick={() => handleUnstage(file)} title="Unstage File" className="text-gray-500 hover:text-white p-0.5">
                -
              </button>
            </div>
          ))}
        </div>

        {/* Unstaged Changes */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase px-1">
            <span>CHANGES ({unstagedFiles.length})</span>
          </div>
          {unstagedFiles.map((file) => (
            <div
              key={file}
              className="flex items-center justify-between p-1.5 rounded hover:bg-[#12151C] text-gray-300 group border border-transparent hover:border-[#232734]"
            >
              <button onClick={() => openFile(file, file.split('/').pop() || file)} className="truncate flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">{file}</span>
              </button>

              <div className="flex items-center space-x-1">
                <span className="text-[9px] text-amber-400 font-bold px-1">M</span>
                <button onClick={() => handleStage(file)} title="Stage File" className="text-gray-500 hover:text-emerald-400 p-0.5">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
