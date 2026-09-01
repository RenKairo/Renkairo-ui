import React, { useEffect, useState } from 'react';
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
  ChevronDown,
  Layers,
  Box,
  CheckCircle2
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ComputeMetrics, DockerContainerInfo, RightSidebarTab, ServerEndpoint } from '../../types/ide';
import { fetchActiveServers, fetchComputeMetrics, fetchDockerContainers } from '../../services/systemService';

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const safeData = data.length > 0 ? data : [0, 0, 0, 0, 0];
  const max = Math.max(...safeData, 100);
  const min = Math.min(...safeData, 0);
  const points = safeData
    .map((val, idx) => {
      const x = (idx / (safeData.length - 1 || 1)) * 120;
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
    theme,
    activeRightTab, 
    setActiveRightTab, 
    metrics, 
    metricsHistory, 
    workloads, 
    loadMetrics,
    setActiveTerminalTab,
    openFile,
    rootName
  } = useIDEStore();

  const [servers, setServers] = useState<ServerEndpoint[]>([]);
  const [dockerData, setDockerData] = useState<{ connected: boolean; containers: DockerContainerInfo[] }>({ connected: false, containers: [] });
  const [compute, setCompute] = useState<ComputeMetrics | null>(null);
  const [recentProjects, setRecentProjects] = useState<{ name: string; path: string; time: string }[]>([]);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(() => {
      loadMetrics();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeRightTab === 'SERVERS') {
      fetchActiveServers().then(setServers);
    } else if (activeRightTab === 'DOCKER') {
      fetchDockerContainers().then(setDockerData);
    } else if (activeRightTab === 'COMPUTE') {
      fetchComputeMetrics().then(setCompute);
    }
  }, [activeRightTab]);

  useEffect(() => {
    const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api';
    fetch(`${API_BASE}/system/recent-projects`)
      .then(res => res.json())
      .then(data => {
        if (data.projects) setRecentProjects(data.projects);
      })
      .catch(() => {});
  }, []);

  const tabs: RightSidebarTab[] = ['OVERVIEW', 'SERVERS', 'DOCKER', 'COMPUTE'];

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-l border-[var(--border-color)] flex flex-col select-none h-full overflow-y-auto z-10 font-sans transition-colors duration-150">
      {/* Header Tabs */}
      <div className="h-9 px-2 border-b border-[#232734] flex items-center justify-between text-xs bg-[#0B0D11] shrink-0">
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = activeRightTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveRightTab(tab)}
                className={`px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors relative ${
                  isActive ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-coral)] cyber-glow-coral"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 space-y-4 flex-1">
        {activeRightTab === 'OVERVIEW' && (
          <>
            {/* System Overview Cards */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
                <span>SYSTEM OVERVIEW</span>
                <div 
                  className="flex items-center space-x-1 text-[10px] bg-[#12151C] border border-[#232734] px-2 py-0.5 rounded text-gray-300 max-w-[150px] truncate"
                  title={metrics?.osName || 'Host Workstation'}
                >
                  <span className="truncate">{metrics?.hostname || 'This Machine'}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* CPU Card */}
                <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1" title={metrics?.cpu?.model}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-semibold">CPU</span>
                    <span className="text-[9px] text-gray-500 font-mono">{metrics?.cpu?.cores || 8} C</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {metrics?.cpu ? `${metrics.cpu.usage}%` : '0%'}
                  </div>
                  <MiniSparkline data={metricsHistory.cpu} color="#38BDF8" />
                </div>

                {/* RAM Card */}
                <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-semibold">RAM</span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {metrics?.ram ? `${metrics.ram.used_gb} / ${metrics.ram.total_gb} GB` : ''}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {metrics?.ram ? `${metrics.ram.usage}%` : '0%'}
                  </div>
                  <MiniSparkline data={metricsHistory.ram} color="#FF4D4D" />
                </div>

                {/* GPU Card */}
                <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1" title={metrics?.gpu?.model}>
                  <span className="text-[10px] text-gray-400 font-semibold">GPU</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {metrics?.gpu ? `${metrics.gpu.usage}%` : '0%'}
                  </div>
                  <span className="text-[9px] text-gray-500 truncate block">
                    {metrics?.gpu?.model || 'Host GPU'}
                  </span>
                </div>

                {/* VRAM Card */}
                <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold">VRAM</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {metrics?.gpu ? `${metrics.gpu.vram_percent}%` : '0%'}
                  </div>
                  <span className="text-[9px] text-gray-500 block font-mono">
                    {metrics?.gpu ? `${metrics.gpu.vram_used_gb} / ${metrics.gpu.vram_total_gb} GB` : '0 / 0 GB'}
                  </span>
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
                  <span className="font-mono text-[10px] text-gray-400">
                    {metrics?.storage 
                      ? `${metrics.storage.used_gb} GB / ${metrics.storage.total_gb} GB (${metrics.storage.percent}%)`
                      : 'Calculating...'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#0B0D11] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#FF4D4D] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, metrics?.storage?.percent ?? 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Network Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 text-gray-300">
                    <Zap className="w-3.5 h-3.5 text-gray-400" />
                    <span>Network</span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">
                    {metrics?.network 
                      ? `${metrics.network.mbps} Mbps (${metrics.network.percent}%)`
                      : 'Calculating...'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#0B0D11] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#38BDF8] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, metrics?.network?.percent ?? 0))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Active Workloads Cards */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
                <span>ACTIVE WORKLOADS</span>
                <span className="text-[10px] text-gray-500 font-mono">{workloads.length} Active</span>
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
                  onClick={() => openFile('package.json', 'package.json')}
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
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {(recentProjects.length > 0 ? recentProjects : [
                  { name: rootName || 'renkairo-ide', path: '~/projects/renkairo-ide', time: 'Active' }
                ]).map((proj, idx) => (
                  <div key={idx} className="bg-[#12151C] p-2 rounded border border-[#232734] flex items-center justify-between hover:border-[#38BDF8]/30 cursor-pointer">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <Layers className={`w-3.5 h-3.5 shrink-0 ${idx === 0 ? 'text-[#FF4D4D]' : idx === 1 ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{proj.name}</div>
                        <div className="text-[9px] text-gray-500 truncate">{proj.path}</div>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 shrink-0">{proj.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SERVERS TAB */}
        {activeRightTab === 'SERVERS' && (
          <div className="space-y-3 text-xs">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">ACTIVE NETWORK ENDPOINTS</span>
            {servers.length === 0 ? (
              <div className="text-gray-500 text-center py-4">Scanning active ports...</div>
            ) : (
              servers.map((srv) => (
                <div key={srv.id} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">{srv.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">{srv.status}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>{srv.url}</span>
                    <span>Port: {srv.port}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 block">{srv.type}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* DOCKER TAB */}
        {activeRightTab === 'DOCKER' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">DOCKER ENGINE</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${dockerData.connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                {dockerData.connected ? 'DAEMON ONLINE' : 'DAEMON OFFLINE'}
              </span>
            </div>

            {dockerData.containers.length === 0 ? (
              <div className="bg-[#12151C] border border-[#232734] rounded-lg p-3 text-center space-y-2">
                <Box className="w-6 h-6 text-gray-500 mx-auto" />
                <p className="text-gray-400 text-xs">No active Docker containers running.</p>
              </div>
            ) : (
              dockerData.containers.map((c) => (
                <div key={c.id} className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{c.name}</span>
                    <span className="text-[9px] font-mono text-emerald-400">{c.state}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono truncate">{c.image}</div>
                  <div className="text-[9px] text-gray-500 flex justify-between">
                    <span>Ports: {c.ports}</span>
                    <span>{c.created}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMPUTE TAB */}
        {activeRightTab === 'COMPUTE' && (
          <div className="space-y-3 text-xs">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">PROCESS MEMORY & HARDWARE CORES</span>
            {compute ? (
              <>
                <div className="bg-[#12151C] border border-[#232734] rounded-lg p-2.5 space-y-2">
                  <span className="text-[10px] text-gray-400 font-semibold">NODE PROCESS MEMORY</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[#0B0D11] p-1.5 rounded border border-[#232734]">
                      <span className="text-gray-500 block">Heap Used</span>
                      <span className="text-white font-bold">{compute.memory.heapUsed} MB</span>
                    </div>
                    <div className="bg-[#0B0D11] p-1.5 rounded border border-[#232734]">
                      <span className="text-gray-500 block">RSS</span>
                      <span className="text-white font-bold">{compute.memory.rss} MB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">CPU CORES ({compute.cores.length})</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {compute.cores.map((c: { id: number; usage: number }) => (
                      <div key={c.id} className="bg-[#12151C] border border-[#232734] rounded p-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">Core #{c.id}</span>
                        <span className="font-mono text-cyan-400">{c.usage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-4">Loading compute specs...</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
