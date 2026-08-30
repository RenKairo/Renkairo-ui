import React, { useState } from 'react';
import { Box, Play, Square, RotateCw, Terminal, Layers } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const DockerPanel: React.FC = () => {
  const { setActiveTerminalTab } = useIDEStore();
  const [containers, setContainers] = useState([
    { id: 'c1', name: 'renkairo-backend', image: 'fastapi-app:v1', ports: '8000:8000', status: 'running' },
    { id: 'c2', name: 'renkairo-redis', image: 'redis:alpine', ports: '6379:6379', status: 'running' },
    { id: 'c3', name: 'renkairo-postgres', image: 'postgres:15', ports: '5432:5432', status: 'stopped' }
  ]);

  const toggleContainer = (id: string) => {
    setContainers(containers.map(c => 
      c.id === id ? { ...c, status: c.status === 'running' ? 'stopped' : 'running' } : c
    ));
  };

  return (
    <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>DOCKER CONTAINERS</span>
        <button title="Refresh Docker Engine" className="p-1 hover:text-white transition-colors">
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="text-[10px] font-mono text-gray-400 font-semibold uppercase px-1">
          CONTAINERS ({containers.length})
        </div>

        <div className="space-y-2 font-mono">
          {containers.map((c) => (
            <div key={c.id} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">{c.name}</h4>
                    <span className="text-[9px] text-gray-500">{c.image}</span>
                  </div>
                </div>

                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  c.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
                }`}>
                  {c.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#232734]/60 text-[10px] text-gray-400">
                <span>Port: {c.ports}</span>

                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setActiveTerminalTab('OUTPUT')} 
                    title="View Container Logs"
                    className="p-1 hover:text-white text-gray-400"
                  >
                    <Terminal className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => toggleContainer(c.id)} 
                    title={c.status === 'running' ? 'Stop Container' : 'Start Container'}
                    className={`p-1 ${c.status === 'running' ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                  >
                    {c.status === 'running' ? <Square className="w-3 h-3 fill-rose-400" /> : <Play className="w-3 h-3 fill-emerald-400" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
