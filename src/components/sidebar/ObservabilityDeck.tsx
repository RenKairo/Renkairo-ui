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
  CheckCircle2,
  X
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
    rootName,
    toggleRightSidebar
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
      <div className="h-9 px-2 border-b border-[var(--border-color)] flex items-center justify-between text-xs bg-[var(--bg-panel)] shrink-0">
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

        {/* Close System Overview Panel Button */}
        <button
          onClick={toggleRightSidebar}
          title="Close System Overview Panel"
          className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4 flex-1">
        {activeRightTab === 'OVERVIEW' && (
          <>
            {/* System Overview Cards */}
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold mb-2 uppercase tracking-wider">
                <span>SYSTEM OVERVIEW</span>
                <div 
                  className="flex items-center space-x-1 text-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[var(--text-secondary)] max-w-[150px] truncate shadow-sm"
                  title={metrics?.osName || 'Host Workstation'}
                >
                  <span className="truncate">{metrics?.hostname || 'This Machine'}</span>
                  <ChevronDown className="w-3 h-3 text-[var(--text-subtle)] shrink-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* CPU Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1 shadow-sm" title={metrics?.cpu?.model}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold">CPU</span>
                    <span className="text-[9px] text-[var(--text-subtle)] font-mono">{metrics?.cpu?.cores || 8} C</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {metrics?.cpu ? `${metrics.cpu.usage}%` : '0%'}
                  </div>
                  <MiniSparkline data={metricsHistory.cpu} color="var(--accent-cyan)" />
                </div>

                {/* RAM Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold">RAM</span>
                    <span className="text-[9px] text-[var(--text-subtle)] font-mono">
                      {metrics?.ram ? `${metrics.ram.used_gb} / ${metrics.ram.total_gb} GB` : ''}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {metrics?.ram ? `${metrics.ram.usage}%` : '0%'}
                  </div>
                  <MiniSparkline data={metricsHistory.ram} color="var(--accent-coral)" />
                </div>

                {/* GPU Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1 shadow-sm" title={metrics?.gpu?.model}>
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold">GPU</span>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {metrics?.gpu ? `${metrics.gpu.usage}%` : '0%'}
                  </div>
                  <span className="text-[9px] text-[var(--text-subtle)] truncate block font-mono">
                    {metrics?.gpu?.model || 'Host GPU'}
                  </span>
                </div>

                {/* VRAM Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1 shadow-sm">
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold">VRAM</span>
                  <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {metrics?.gpu ? `${metrics.gpu.vram_percent}%` : '0%'}
                  </div>
                  <span className="text-[9px] text-[var(--text-subtle)] block font-mono">
                    {metrics?.gpu ? `${metrics.gpu.vram_used_gb} / ${metrics.gpu.vram_total_gb} GB` : '0 / 0 GB'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resources Linear Gauges */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 space-y-3 shadow-sm">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block">RESOURCES</span>
              
              {/* Storage Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 text-[var(--text-secondary)]">
                    <HardDrive className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Storage</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {metrics?.storage 
                      ? `${metrics.storage.used_gb} GB / ${metrics.storage.total_gb} GB (${metrics.storage.percent}%)`
                      : 'Calculating...'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div 
                    className="h-full bg-[var(--accent-coral)] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, metrics?.storage?.percent ?? 0))}%` }}
                  ></div>
                </div>
              </div>

              {/* Network Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 text-[var(--text-secondary)]">
                    <Zap className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Network</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {metrics?.network 
                      ? `${metrics.network.mbps} Mbps (${metrics.network.percent}%)`
                      : 'Calculating...'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div 
                    className="h-full bg-[var(--accent-cyan)] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, metrics?.network?.percent ?? 0))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Active Workloads Cards */}
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold mb-2 uppercase tracking-wider">
                <span>ACTIVE WORKLOADS</span>
                <span className="text-[10px] text-[var(--text-subtle)] font-mono">{workloads.length} Active</span>
              </div>

              <div className="space-y-2">
                {workloads.map((w) => (
                  <div key={w.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-2 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)]">{w.name}</h4>
                        <span className="text-[10px] text-[var(--text-muted)]">{w.target}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-semibold block ${w.status === 'In Progress' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {w.status}
                        </span>
                        <span className="text-[9px] text-[var(--text-subtle)]">{w.framework} {w.progress > 0 ? `${w.progress}%` : ''}</span>
                      </div>
                    </div>

                    {w.progress > 0 && (
                      <div className="h-1 w-full bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div 
                          className="h-full bg-[var(--accent-coral)] rounded-full transition-all duration-300"
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
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block mb-2">QUICK ACTIONS</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => setActiveTerminalTab('PORTS')}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 rounded-lg flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left shadow-sm cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                  <span className="text-[11px]">Connect Server</span>
                </button>
                <button 
                  onClick={() => setActiveTerminalTab('TERMINAL')}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 rounded-lg flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left shadow-sm cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                  <span className="text-[11px]">New Terminal</span>
                </button>
                <button 
                  onClick={() => setActiveTerminalTab('TERMINAL')}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 rounded-lg flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left shadow-sm cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px]">Run Project</span>
                </button>
                <button 
                  onClick={() => alert('Deployment trigger sent to cloud backend!')}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 rounded-lg flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left shadow-sm cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Deploy</span>
                </button>
                <button 
                  onClick={() => openFile('package.json', 'package.json')}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 rounded-lg flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left shadow-sm cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                  <span className="text-[11px]">New File</span>
                </button>
                <button 
                  onClick={() => setActiveTerminalTab('OUTPUT')}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 rounded-lg flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-left shadow-sm cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                  <span className="text-[11px]">Open Output</span>
                </button>
              </div>
            </div>

            {/* Recent Projects List */}
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold mb-2 uppercase tracking-wider">
                <span>RECENT PROJECTS</span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {(recentProjects.length > 0 ? recentProjects : [
                  { name: rootName || 'renkairo-ide', path: '~/projects/renkairo-ide', time: 'Active' }
                ]).map((proj, idx) => (
                  <div key={idx} className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--accent-cyan)]/40 cursor-pointer shadow-sm transition-colors">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <Layers className={`w-3.5 h-3.5 shrink-0 ${idx === 0 ? 'text-[var(--accent-coral)]' : idx === 1 ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <div className="truncate">
                        <div className="font-semibold text-[var(--text-primary)] truncate">{proj.name}</div>
                        <div className="text-[9px] text-[var(--text-muted)] truncate">{proj.path}</div>
                      </div>
                    </div>
                    <span className="text-[9px] text-[var(--text-subtle)] shrink-0">{proj.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SERVERS TAB */}
        {activeRightTab === 'SERVERS' && (
          <div className="space-y-3 text-xs">
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block">ACTIVE NETWORK ENDPOINTS</span>
            {servers.length === 0 ? (
              <div className="text-[var(--text-muted)] text-center py-4 font-mono">Scanning active ports...</div>
            ) : (
              servers.map((srv) => (
                <div key={srv.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-semibold text-[var(--text-primary)]">{srv.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">{srv.status}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                    <span>{srv.url}</span>
                    <span>Port: {srv.port}</span>
                  </div>
                  <span className="text-[9px] text-[var(--text-subtle)] block">{srv.type}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* DOCKER TAB */}
        {activeRightTab === 'DOCKER' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">DOCKER ENGINE</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${dockerData.connected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'}`}>
                {dockerData.connected ? 'DAEMON ONLINE' : 'DAEMON OFFLINE'}
              </span>
            </div>

            {dockerData.containers.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 text-center space-y-2 shadow-sm">
                <Box className="w-6 h-6 text-[var(--text-subtle)] mx-auto" />
                <p className="text-[var(--text-muted)] text-xs">No active Docker containers running.</p>
              </div>
            ) : (
              dockerData.containers.map((c) => (
                <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{c.name}</span>
                    <span className="text-[9px] font-mono text-emerald-500 font-bold">{c.state}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">{c.image}</div>
                  <div className="text-[9px] text-[var(--text-subtle)] flex justify-between">
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
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block">PROCESS MEMORY & HARDWARE CORES</span>
            {compute ? (
              <>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-2 shadow-sm">
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold">NODE PROCESS MEMORY</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[var(--bg-base)] p-1.5 rounded border border-[var(--border-color)]">
                      <span className="text-[var(--text-muted)] block">Heap Used</span>
                      <span className="text-[var(--text-primary)] font-bold">{compute.memory.heapUsed} MB</span>
                    </div>
                    <div className="bg-[var(--bg-base)] p-1.5 rounded border border-[var(--border-color)]">
                      <span className="text-[var(--text-muted)] block">RSS</span>
                      <span className="text-[var(--text-primary)] font-bold">{compute.memory.rss} MB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider block">CPU CORES ({compute.cores.length})</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {compute.cores.map((c: { id: number; usage: number }) => (
                      <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded p-1.5 flex items-center justify-between text-[10px] shadow-sm">
                        <span className="text-[var(--text-secondary)]">Core #{c.id}</span>
                        <span className="font-mono text-[var(--accent-cyan)] font-bold">{c.usage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-[var(--text-muted)] text-center py-4 font-mono">Loading compute specs...</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
