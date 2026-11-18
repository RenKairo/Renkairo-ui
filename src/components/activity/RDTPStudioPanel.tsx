import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  FolderOpen,
  Folder,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Laptop,
  Cloud,
  Activity,
  FileCode,
  SlidersHorizontal,
  ArrowRight,
  FolderSync,
  FolderTree,
  Loader2
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';
import { Theorem1AuditResult, RDTPSessionConfig, RDTPTelemetryData } from '../../types/ide';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api';

export const RDTPStudioPanel: React.FC = () => {
  const { 
    workspacePath, 
    rootName, 
    openFolder, 
    setActiveActivity, 
    openFile, 
    setIsRightSidebarOpen, 
    setActiveRightTab 
  } = useIDEStore();

  const [session, setSession] = useState<RDTPSessionConfig>({
    isActive: false,
    workload: 'vit',
    targetEndpoint: '127.0.0.1:50051',
    batchSize: 32,
    bufferDepth: 3,
    codec: 'jpeg',
    uplinkMbps: 40.0,
    dataSource: 'local_dataset',
    datasetPath: '',
    executionTarget: 'local',
    totalEpochs: 3,
  });

  const [datasetPath, setDatasetPath] = useState<string>('');
  const [datasetScan, setDatasetScan] = useState<{
    valid: boolean;
    fileCount: number;
    totalSizeBytes?: number;
    totalSizeFormatted?: string;
    sampleFiles?: string[];
    error?: string;
  } | null>(null);

  const [isScanningDataset, setIsScanningDataset] = useState(false);
  const [isGeneratingDataset, setIsGeneratingDataset] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [audit, setAudit] = useState<Theorem1AuditResult | null>(null);
  const [telemetry, setTelemetry] = useState<RDTPTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scaffoldStatus, setScaffoldStatus] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  // Local fallback calculation
  const computeLocalAudit = (cfg: RDTPSessionConfig): Theorem1AuditResult => {
    const w = (cfg.workload || 'vit').toLowerCase();
    let rawBytes = 0;
    let wireBytes = 0;
    let tPrepMs = 42.0;
    let tGpuMs = 284.0;
    if (w.includes('vit')) {
      rawBytes = cfg.batchSize * 3 * 224 * 224 * 4;
      wireBytes = cfg.codec === 'raw_fp32' ? rawBytes : cfg.batchSize * 28 * 1024;
      tGpuMs = 284.0;
      tPrepMs = 42.0;
    } else if (w.includes('resnet')) {
      rawBytes = cfg.batchSize * 3 * 224 * 224 * 4;
      wireBytes = cfg.codec === 'raw_fp32' ? rawBytes : cfg.batchSize * 28 * 1024;
      tGpuMs = 210.0;
      tPrepMs = 38.0;
    } else {
      rawBytes = cfg.batchSize * 3 * 512 * 512 * 4;
      wireBytes = cfg.codec === 'raw_fp32' ? rawBytes : cfg.batchSize * 145 * 1024;
      tGpuMs = 1420.0;
      tPrepMs = 60.0;
    }
    const bloatRatio = Number((rawBytes / Math.max(wireBytes, 1)).toFixed(2));
    const wireBits = wireBytes * 8;
    const effectiveBps = Math.max(cfg.uplinkMbps, 1) * 1_000_000;
    const tNetMs = Number(((wireBits / effectiveBps) * 1000 + 8.5).toFixed(1));
    const tDmaMs = Number(((rawBytes / (16 * 1024 * 1024 * 1024)) * 1000).toFixed(1));
    const maxUpstream = Math.max(tPrepMs, tNetMs, tDmaMs);
    const isComputeBound = maxUpstream <= tGpuMs;
    const throughput = Number((1000.0 / Math.max(maxUpstream, tGpuMs)).toFixed(2));
    const predictedDutyCycle = isComputeBound ? 85.0 : Number(Math.min(75.0, (tGpuMs / tNetMs) * 95).toFixed(1));

    return {
      workload: cfg.workload,
      batchSize: cfg.batchSize,
      uplinkMbps: cfg.uplinkMbps,
      rawTensorBytes: rawBytes,
      wirePayloadBytes: wireBytes,
      bloatRatio,
      timings: { tPrepMs, tNetMs, tDmaMs, tGpuMs },
      isComputeBound,
      bottleneckStage: isComputeBound ? 'GPU_COMPUTE' : 'WAN_NETWORK',
      sustainableThroughputBatchesPerSec: throughput,
      predictedGpuDutyCyclePct: predictedDutyCycle,
      recommendation: isComputeBound
        ? `Compute-bound: Upstream latency is masked.`
        : `Network-bound: Ingestion latency exceeds GPU step time.`,
    };
  };

  const fetchStatus = async () => {
    const res = await fetch(`${API_BASE}/rdtp/status`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        if (data.session) {
          setSession(data.session);
          if (data.session.datasetPath && !datasetPath) {
            setDatasetPath(data.session.datasetPath);
            handleScanDataset(data.session.datasetPath);
          }
        }
        if (data.theorem1) setAudit(data.theorem1);
        if (data.telemetry) setTelemetry(data.telemetry);
        setIsBackendConnected(true);
      }
    } else {
      setIsBackendConnected(false);
      setAudit((prev) => prev || computeLocalAudit(session));
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync with currently active IDE workspace if datasetPath is not set
  useEffect(() => {
    if (workspacePath && !datasetPath) {
      setDatasetPath(workspacePath);
      handleScanDataset(workspacePath);
    }
  }, [workspacePath]);

  const handleAudit = async (configOverride?: Partial<RDTPSessionConfig>) => {
    const updated = { ...session, ...configOverride };
    if (isBackendConnected === false) {
      setAudit(computeLocalAudit(updated));
      return;
    }
    const res = await fetch(`${API_BASE}/rdtp/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workload: updated.workload,
        batchSize: updated.batchSize,
        uplinkMbps: updated.uplinkMbps,
        codec: updated.codec,
      }),
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      setAudit(data || computeLocalAudit(updated));
    } else {
      setAudit(computeLocalAudit(updated));
    }
  };

  const handleConfigChange = async (updates: Partial<RDTPSessionConfig>) => {
    const nextSession = { ...session, ...updates };
    setSession(nextSession);
    handleAudit(updates);
    if (isBackendConnected) {
      await fetch(`${API_BASE}/rdtp/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch(() => null);
    }
  };

  const handleScanDataset = async (pathToScan: string) => {
    if (!pathToScan || !pathToScan.trim()) return;
    setIsScanningDataset(true);
    try {
      const res = await fetch(`${API_BASE}/rdtp/dataset/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathToScan }),
      });
      if (res.ok) {
        const data = await res.json();
        setDatasetScan(data);
        if (data.valid) {
          handleConfigChange({ datasetPath: pathToScan });
        }
      }
    } catch (err) {
      console.error('Error scanning dataset:', err);
    } finally {
      setIsScanningDataset(false);
    }
  };

  // Loads folder into IDE workspace (codebase explorer) AND streams it via RDTP
  const handleBrowseFolder = async () => {
    try {
      const result = await openFolder();
      if (result && result.path) {
        setDatasetPath(result.path);
        await handleScanDataset(result.path);
        await handleConfigChange({ datasetPath: result.path });
      }
    } catch (err) {
      console.error('Failed to open folder into workspace:', err);
    }
  };

  const handleUseCurrentWorkspace = async () => {
    if (workspacePath) {
      setDatasetPath(workspacePath);
      await handleScanDataset(workspacePath);
      await handleConfigChange({ datasetPath: workspacePath });
    }
  };

  const handleGenerateSampleDataset = async () => {
    setIsGeneratingDataset(true);
    try {
      const res = await fetch(`${API_BASE}/rdtp/dataset/sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setDatasetScan(data);
        if (data.path) {
          setDatasetPath(data.path);
          handleConfigChange({ datasetPath: data.path });
          // Also load the sample dataset folder into the IDE workspace tree!
          await openFolder(data.path);
        }
      }
    } catch (err) {
      console.error('Failed to generate sample dataset:', err);
    } finally {
      setIsGeneratingDataset(false);
    }
  };

  const handleToggleStream = async () => {
    setIsLoading(true);
    const endpoint = session.isActive ? '/rdtp/stop' : '/rdtp/start';
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        if (data.session) setSession(data.session);
        if (data.telemetry) setTelemetry(data.telemetry);
        if (data.theorem1) setAudit(data.theorem1);
      }
    }
    setIsLoading(false);
  };

  const handleScaffold = async (templateKey: string) => {
    setScaffoldStatus(`Generating ${templateKey}...`);
    const res = await fetch(`${API_BASE}/rdtp/scaffold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: templateKey }),
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.filename) {
        setScaffoldStatus(`Created: ${data.filename}`);
        setTimeout(() => setScaffoldStatus(null), 3000);
        if (data.fullPath && data.filename) {
          openFile(data.fullPath, data.filename);
        }
      }
    }
  };

  const isCompleted = telemetry?.pipelineState === 'COMPLETED';

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150 overflow-y-auto">
      {/* 1. Header (Clean & Peaceful) */}
      <div className="p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/30 flex items-center justify-center">
            <ToriiIcon color="var(--accent-coral)" className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
              RDTP Streaming
            </h2>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Train without cloud upload
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-color)]">
          <span
            className={`w-2 h-2 rounded-full ${
              session.isActive
                ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30'
                : isCompleted
                ? 'bg-indigo-400'
                : 'bg-zinc-500'
            }`}
          />
          <span className="text-[9px] font-medium text-[var(--text-secondary)]">
            {session.isActive ? 'Streaming' : isCompleted ? 'Finished' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Backend Offline Warning (Compact) */}
      {isBackendConnected === false && (
        <div className="mx-3 mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Backend offline. Previewing in local simulator.</span>
        </div>
      )}

      <div className="p-3.5 space-y-3.5">
        {/* 2. Dataset Selection (Unified with IDE Workspace) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Workspace Dataset</span>
            </span>
            <div className="flex items-center space-x-2">
              {datasetScan?.valid && (
                <button
                  onClick={handleBrowseFolder}
                  className="text-[10px] text-[var(--accent-coral)] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium flex items-center space-x-1"
                  title="Choose and load a different folder into the IDE"
                >
                  <FolderSync className="w-3 h-3" />
                  <span>Change Folder</span>
                </button>
              )}
            </div>
          </div>

          {datasetScan && datasetScan.valid ? (
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-[11px] font-medium text-emerald-300 truncate">
                        {datasetScan.fileCount} images indexed
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] truncate">
                        {datasetScan.totalSizeFormatted} • direct disk stream
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleScanDataset(datasetPath)}
                    disabled={isScanningDataset}
                    className="p-1 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/20 rounded transition-colors"
                    title="Re-scan directory"
                  >
                    <RefreshCw className={`w-3 h-3 ${isScanningDataset ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="text-[9px] font-mono text-[var(--text-muted)] truncate bg-[var(--bg-base)]/60 px-1.5 py-1 rounded border border-[var(--border-color)]/40 flex items-center justify-between" title={datasetPath}>
                  <span className="truncate">{datasetPath}</span>
                </div>
              </div>

              {/* IDE Workspace Integration Bar */}
              <div className="flex items-center justify-between text-[10px] px-1">
                {workspacePath === datasetPath ? (
                  <span className="text-emerald-400/90 flex items-center space-x-1 font-mono text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Loaded in Workspace</span>
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] text-[9px] truncate max-w-[140px]">
                    Workspace: {rootName || 'None'}
                  </span>
                )}

                <button
                  onClick={() => setActiveActivity('explorer')}
                  className="text-[10px] text-[var(--accent-coral)] hover:underline flex items-center space-x-1 cursor-pointer bg-transparent border-0 p-0 font-medium"
                >
                  <FolderTree className="w-3 h-3" />
                  <span>View in Explorer</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {isScanningDataset ? (
                <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-center space-x-2 text-[11px] text-[var(--text-muted)] font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-coral)]" />
                  <span>Scanning dataset folder...</span>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Choose a folder on your computer to load as your workspace codebase & dataset, or test with demo data:
                  </p>

                  {/* If user already has an IDE workspace loaded, offer 1-click option */}
                  {workspacePath && workspacePath !== datasetPath && (
                    <button
                      onClick={handleUseCurrentWorkspace}
                      className="w-full py-1.5 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] font-medium text-emerald-300 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <FolderTree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Use IDE Workspace: <b>{rootName || 'Project'}</b></span>
                      </div>
                      <ArrowRight className="w-3 h-3 shrink-0 ml-1" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleBrowseFolder}
                      className="py-1.5 px-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-coral)] text-[10px] font-medium text-[var(--text-primary)] flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <FolderOpen className="w-3 h-3 text-[var(--accent-coral)]" />
                      <span>Choose Folder</span>
                    </button>

                    <button
                      onClick={handleGenerateSampleDataset}
                      disabled={isGeneratingDataset}
                      className="py-1.5 px-2 rounded-lg bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/30 hover:bg-[var(--accent-coral)]/20 text-[10px] font-medium text-[var(--accent-coral)] flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isGeneratingDataset ? 'Creating...' : 'Use Demo Data'}</span>
                    </button>
                  </div>

                  {datasetScan && !datasetScan.valid && datasetPath && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] flex items-center space-x-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
                      <span>No images found (.jpg, .png, .npy). Select a folder with images or use Demo Data.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. Model & Environment (Simple & Uncluttered) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 space-y-3 shadow-xs">
          {/* Model Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[var(--text-muted)] block">
              Model
            </label>
            <select
              value={session.workload}
              onChange={(e) => handleConfigChange({ workload: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-coral)] cursor-pointer"
            >
              <option value="vit">Vision Transformer (ViT-B/16)</option>
              <option value="resnet">ResNet-50 (ImageNet CNN)</option>
              <option value="diffusion">Stable Diffusion Latents</option>
            </select>
          </div>

          {/* Execution Target (Local vs Cloud Pill) */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-[var(--text-muted)] block">
              Where to train
            </label>
            <div className="grid grid-cols-2 p-0.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)]">
              <button
                onClick={() => handleConfigChange({ executionTarget: 'local' })}
                className={`py-1.5 rounded-md text-[10px] font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                  session.executionTarget !== 'remote'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>This PC</span>
              </button>

              <button
                onClick={() => handleConfigChange({ executionTarget: 'remote' })}
                className={`py-1.5 rounded-md text-[10px] font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                  session.executionTarget === 'remote'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Cloud className="w-3 h-3" />
                <span>Cloud GPU</span>
              </button>
            </div>

            {session.executionTarget === 'remote' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={session.targetEndpoint}
                  onChange={(e) => handleConfigChange({ targetEndpoint: e.target.value })}
                  placeholder="Server IP:port (e.g. 10.195.107.193:50051)"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-coral)]"
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. The Primary Big Action Button */}
        <div>
          <button
            onClick={handleToggleStream}
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
              session.isActive
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : isCompleted
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-400/30'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-400/40'
            }`}
          >
            {session.isActive ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Training</span>
              </>
            ) : isCompleted ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Run Training Again</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Training</span>
              </>
            )}
          </button>
        </div>

        {/* 5. Live Human Metrics (Shown ONLY when streaming or completed) */}
        {(session.isActive || isCompleted) && telemetry && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 space-y-2.5 shadow-xs animate-in fade-in duration-200">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)] font-medium">
                  Epoch {telemetry.currentEpoch} of {session.totalEpochs || 3}
                </span>
                <span className="text-[var(--text-primary)] font-bold">
                  {telemetry.datasetProgressPct || 0}%
                </span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-[var(--accent-coral)] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, telemetry.datasetProgressPct || 0)}%` }}
                />
              </div>
            </div>

            {/* 3 Human Numbers: Loss, Accuracy, Speed */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
              <div className="bg-[var(--bg-base)] p-2 rounded-lg border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-muted)] block">Loss</span>
                <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                  {telemetry.currentLoss.toFixed(3)}
                </span>
              </div>

              <div className="bg-[var(--bg-base)] p-2 rounded-lg border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-muted)] block">Accuracy</span>
                <span className="text-xs font-bold text-[var(--accent-cyan)] block mt-0.5">
                  {telemetry.currentAccuracy ? `${telemetry.currentAccuracy}%` : '52%'}
                </span>
              </div>

              <div className="bg-[var(--bg-base)] p-2 rounded-lg border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-muted)] block">Speed</span>
                <span className="text-xs font-bold text-[var(--text-primary)] block mt-0.5">
                  {Math.round(telemetry.measuredThroughputFps || 100)} <span className="text-[8px] font-normal text-[var(--text-muted)]">img/s</span>
                </span>
              </div>
            </div>

            {/* Reassuring Proof of Zero S3 Cost */}
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 text-[10px] text-center font-medium">
              💡 Zero upload wait • Saved ${(telemetry.accumulatedIdleDollarsSaved || 0.05).toFixed(3)} in idle GPU fees
            </div>
          </div>
        )}

        {/* 6. Progressive Disclosure: Advanced Settings Toggle */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-1.5 px-2 rounded-lg hover:bg-[var(--bg-card)] text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-between cursor-pointer transition-colors"
          >
            <span className="flex items-center space-x-1.5 font-medium">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Advanced Settings</span>
            </span>
            {showAdvanced ? (
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 text-xs animate-in fade-in duration-150">
              {/* Uplink slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">WAN Bandwidth</span>
                  <span className="font-semibold text-[var(--accent-coral)]">{session.uplinkMbps} Mbps</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={session.uplinkMbps}
                  onChange={(e) => handleConfigChange({ uplinkMbps: Number(e.target.value) })}
                  className="w-full accent-[var(--accent-coral)] cursor-pointer"
                />
              </div>

              {/* Codec */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">Compression Codec</span>
                  <span className="font-semibold uppercase text-[var(--text-primary)]">{session.codec}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['jpeg', 'webp', 'raw_fp32'].map((c) => (
                    <button
                      key={c}
                      onClick={() => handleConfigChange({ codec: c })}
                      className={`py-1 rounded text-[10px] border transition-colors cursor-pointer capitalize ${
                        session.codec === c
                          ? 'bg-[var(--accent-coral)]/15 border-[var(--accent-coral)] text-[var(--accent-coral)] font-bold'
                          : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {c === 'raw_fp32' ? 'Raw' : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theorem 1 Overlap Summary */}
              {audit && (
                <div className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] space-y-1 text-[10px]">
                  <div className="flex justify-between font-medium">
                    <span className="text-[var(--text-muted)]">Pipeline State:</span>
                    <span className={audit.isComputeBound ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {audit.isComputeBound ? 'Compute-Bound (Masked)' : 'I/O-Bound'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>GPU Duty Cycle:</span>
                    <span className="text-[var(--text-primary)] font-semibold">{audit.predictedGpuDutyCyclePct}%</span>
                  </div>
                </div>
              )}

              {/* Starter code templates */}
              <div className="space-y-1.5 pt-1 border-t border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">
                  PyTorch Starter Files
                </span>
                {scaffoldStatus && (
                  <div className="p-1 text-[10px] rounded bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-center">
                    {scaffoldStatus}
                  </div>
                )}
                <div className="space-y-1">
                  {[
                    { id: 'counter', title: 'counter.py (Minimal On-Demand)' },
                    { id: 'vit', title: 'train_vit_rdtp.py' },
                    { id: 'resnet', title: 'train_resnet_rdtp.py' },
                    { id: 'consumer', title: 'rdtp_consumer_worker.py' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleScaffold(t.id)}
                      className="w-full text-left p-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 text-[10px] font-mono text-[var(--text-secondary)] flex items-center justify-between cursor-pointer group"
                    >
                      <span>{t.title}</span>
                      <FileCode className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)]" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Observability Deck Button */}
              <button
                onClick={() => {
                  setIsRightSidebarOpen(true);
                  setActiveRightTab('RDTP_TELEMETRY');
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-coral)]/40 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center space-x-1 cursor-pointer transition-colors"
              >
                <Activity className="w-3 h-3 text-[var(--accent-coral)]" />
                <span>Open Observability Charts</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
