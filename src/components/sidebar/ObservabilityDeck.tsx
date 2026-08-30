import React, { useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Zap, 
  Server, 
  Terminal, 
  Play, 
  Rocket, 
  FilePlus, 
  FileText,
  Clock,
  ChevronDown,
  Layers
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { RightSidebarTab } from '../../types/ide';

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 120;
      const y = 30 - ((val - min) / (max - min || 1)) * 25;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="w-full h-8 overflow-visible" viewBox="0 0 120 30">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const ObservabilityDeck: React.FC = () => {
  const { 
    activeRightTab, 
    setActiveRightTab, 
    metrics, 
    metricsHistory, 
    workloads, 
    loadMetrics,
    setActiveTerminalTab,
    openFile
  } = useIDEStore();

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(() => {
      loadMetrics();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const tabs: RightSidebarTab[] = ['OVERVIEW', 'SERVERS', 'DOCKER', 'COMPUTE'];

  return (
    <aside className="w-full bg-[#0B0D11] border-l border-[#232734] flex flex-col select-none h-full overflow-y-auto z-10 font-sans">
      {/* Header Tabs */}
      <div className="h-9 px-2 border-b border-[#232734] flex items-center justify-between text-xs bg-[#0B0D11]">
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = activeRightTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveRightTab(tab)}
                className={`px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors relative ${
                  isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4D4D] cyber-glow-coral"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* System Overview Cards */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
            <span>SYSTEM OVERVIEW</span>
            <div className="flex items-center space-x-1 text-[10px] bg-[#12151C] border border-[#232734] px-2 py-0.5 rounded text-gray-300">
              <span>This Machine</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* CPU Card */}
            <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold">CPU</span>
              <div className="text-xl font-bold font-mono text-white">
                {metrics?.cpu.usage || 23}%
              </div>
              <MiniSparkline data={metricsHistory.cpu} color="#38BDF8" />
            </div>

            {/* RAM Card */}
            <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold">RAM</span>
              <div className="text-xl font-bold font-mono text-white">
                {metrics?.ram.usage || 42}%
              </div>
              <MiniSparkline data={metricsHistory.ram} color="#FF4D4D" />
            </div>

            {/* GPU Card */}
            <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold">GPU</span>
              <div className="text-xl font-bold font-mono text-white">
                {metrics?.gpu.usage || 58}%
              </div>
              <span className="text-[9px] text-gray-500 truncate block">NVIDIA A100</span>
            </div>

            {/* VRAM Card */}
            <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold">VRAM</span>
              <div className="text-xl font-bold font-mono text-white">
                {metrics?.gpu.vram_percent || 67}%
              </div>
              <span className="text-[9px] text-gray-500 block">{metrics?.gpu.vram_used_gb || 32.1} / 48 GB</span>
            </div>
          </div>
        </div>

        {/* Resources Linear Gauges */}
        <div className="bg-[#12151C] border border-[#232734] rounded-lg p-3 space-y-3">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">RESOURCES</span>
          
          {/* Storage Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 text-gray-300">
                <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                <span>Storage</span>
              </div>
              <span className="font-mono text-[10px] text-gray-400">256 GB / 1 TB (25%)</span>
            </div>
            <div className="h-1.5 w-full bg-[#0B0D11] rounded-full overflow-hidden">
              <div className="h-full bg-[#FF4D4D] rounded-full w-1/4"></div>
            </div>
          </div>

          {/* Network Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 text-gray-300">
                <Zap className="w-3.5 h-3.5 text-gray-400" />
                <span>Network</span>
              </div>
              <span className="font-mono text-[10px] text-gray-400">128 Mbps / 1 Gbps (12%)</span>
            </div>
            <div className="h-1.5 w-full bg-[#0B0D11] rounded-full overflow-hidden">
              <div className="h-full bg-[#38BDF8] rounded-full w-[12%]"></div>
            </div>
          </div>
        </div>

        {/* Active Workloads Cards */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
            <span>ACTIVE WORKLOADS</span>
            <button className="text-[10px] text-[#38BDF8] hover:underline">View All &gt;</button>
          </div>

          <div className="space-y-2">
            {workloads.map((w) => (
              <div key={w.id} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">{w.name}</h4>
                    <span className="text-[10px] text-gray-400">{w.target}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-semibold block ${w.status === 'In Progress' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {w.status}
                    </span>
                    <span className="text-[9px] text-gray-500">{w.framework} {w.progress > 0 ? `${w.progress}%` : ''}</span>
                  </div>
                </div>

                {w.progress > 0 && (
                  <div className="h-1 w-full bg-[#0B0D11] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FF4D4D] rounded-full transition-all duration-300"
                      style={{ width: `${w.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-2">QUICK ACTIONS</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button 
              onClick={() => setActiveTerminalTab('PORTS')}
              className="p-2 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all text-left"
            >
              <Server className="w-3.5 h-3.5 text-[#FF4D4D]" />
              <span className="text-[11px]">Connect Server</span>
            </button>
            <button 
              onClick={() => setActiveTerminalTab('TERMINAL')}
              className="p-2 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all text-left"
            >
              <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-[11px]">New Terminal</span>
            </button>
            <button 
              onClick={() => setActiveTerminalTab('TERMINAL')}
              className="p-2 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all text-left"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Run Project</span>
            </button>
            <button 
              onClick={() => alert('Deployment trigger sent to cloud backend!')}
              className="p-2 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all text-left"
            >
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">Deploy</span>
            </button>
            <button 
              onClick={() => openFile('backend/server.py', 'server.py')}
              className="p-2 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all text-left"
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px]">New File</span>
            </button>
            <button 
              onClick={() => setActiveTerminalTab('OUTPUT')}
              className="p-2 bg-[#12151C] border border-[#232734] hover:border-[#38BDF8]/40 rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all text-left"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px]">Open Logs</span>
            </button>
          </div>
        </div>

        {/* Recent Projects List */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
            <span>RECENT PROJECTS</span>
            <button className="text-[10px] text-[#38BDF8] hover:underline">View All &gt;</button>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="bg-[#12151C] p-2 rounded border border-[#232734] flex items-center justify-between hover:border-[#38BDF8]/30 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-[#FF4D4D]" />
                <div>
                  <div className="font-semibold text-white">renkairo-platform</div>
                  <div className="text-[9px] text-gray-500">~/projects/renkairo-platform</div>
                </div>
              </div>
              <span className="text-[9px] text-gray-500">2m ago</span>
            </div>

            <div className="bg-[#12151C] p-2 rounded border border-[#232734] flex items-center justify-between hover:border-[#38BDF8]/30 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="font-semibold text-gray-300">ai-models</div>
                  <div className="text-[9px] text-gray-500">~/projects/ai-models</div>
                </div>
              </div>
              <span className="text-[9px] text-gray-500">1h ago</span>
            </div>

            <div className="bg-[#12151C] p-2 rounded border border-[#232734] flex items-center justify-between hover:border-[#38BDF8]/30 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="font-semibold text-gray-300">data-pipeline</div>
                  <div className="text-[9px] text-gray-500">~/projects/data-pipeline</div>
                </div>
              </div>
              <span className="text-[9px] text-gray-500">3h ago</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
