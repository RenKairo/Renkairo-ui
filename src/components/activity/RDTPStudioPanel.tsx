import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Folder,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  FileCode,
  ArrowRight,
  FolderSync,
  FolderTree,
  Loader2,
  Copy,
  Check,
  Radio,
  HardDrive
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';
import { RDTPSessionConfig, RDTPTelemetryData } from '../../types/ide';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api';

export const RDTPStudioPanel: React.FC = () => {
  const { 
    workspacePath, 
    rootName, 
    openFolder, 
    setActiveActivity, 
    openFile 
  } = useIDEStore();

  const [session, setSession] = useState<RDTPSessionConfig>({
    isActive: false,
    workload: 'custom',
    targetEndpoint: '127.0.0.1:50051',
    batchSize: 32,
    bufferDepth: 3,
    codec: 'jpeg',
    uplinkMbps: 40.0,
    dataSource: 'local_dataset',
    datasetPath: '',
    executionTarget: 'remote',
    totalEpochs: 1,
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
  const [telemetry, setTelemetry] = useState<RDTPTelemetryData | null>(null);
  const [scaffoldStatus, setScaffoldStatus] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  // Poll RDTP engine status
  const fetchStatus = async () => {
    try {
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
          if (data.telemetry) setTelemetry(data.telemetry);
          setIsBackendConnected(true);
        }
      } else {
        setIsBackendConnected(false);
      }
    } catch {
      setIsBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [datasetPath]);

  // Auto-sync with active IDE workspace if datasetPath is not set
  useEffect(() => {
    if (workspacePath && !datasetPath) {
      setDatasetPath(workspacePath);
      handleScanDataset(workspacePath);
    }
  }, [workspacePath]);

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
          await fetch(`${API_BASE}/rdtp/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ datasetPath: pathToScan }),
          }).catch(() => null);
        }
      }
    } catch (err) {
      console.error('Error scanning dataset:', err);
    } finally {
      setIsScanningDataset(false);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const result = await openFolder();
      if (result && result.path) {
        setDatasetPath(result.path);
        await handleScanDataset(result.path);
      }
    } catch (err) {
      console.error('Failed to open folder into workspace:', err);
    }
  };

  const handleUseCurrentWorkspace = async () => {
    if (workspacePath) {
      setDatasetPath(workspacePath);
      await handleScanDataset(workspacePath);
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
          await openFolder(data.path);
        }
      }
    } catch (err) {
      console.error('Failed to generate sample dataset:', err);
    } finally {
      setIsGeneratingDataset(false);
    }
  };

  const handleScaffoldCounter = async () => {
    setScaffoldStatus('Creating counter.py...');
    try {
      const res = await fetch(`${API_BASE}/rdtp/scaffold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'counter' }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.filename) {
          setScaffoldStatus(`Created: ${data.filename}`);
          setTimeout(() => setScaffoldStatus(null), 3000);
          if (data.fullPath) {
            openFile(data.fullPath, data.filename);
          }
        }
      }
    } catch {
      setScaffoldStatus('Failed creating file');
      setTimeout(() => setScaffoldStatus(null), 3000);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2000);
  };

  const isStreaming = Boolean(session.isActive || (telemetry?.pipelineState && telemetry.pipelineState !== 'IDLE' && telemetry.pipelineState !== 'COMPLETED'));
  const isCompleted = telemetry?.pipelineState === 'COMPLETED';

  const pythonSnippet = `import renkairo

# Streams batches on-demand without upfront upload:
for batch in renkairo.load_batches(batch_size=32):
    print(f"Received batch of {len(batch)} images")`;

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150 overflow-y-auto">
      {/* 1. Header */}
      <div className="p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/30 flex items-center justify-center">
            <ToriiIcon color="var(--accent-coral)" className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
              Dataset Streamer
            </h2>
            <span className="text-[10px] text-[var(--text-muted)] block">
              On-demand streaming for renkairo.py
            </span>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-color)]">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming
                ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30'
                : isCompleted
                ? 'bg-indigo-400'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-[9px] font-medium text-[var(--text-secondary)]">
            {isStreaming ? 'Streaming Live' : isCompleted ? 'Finished' : 'Ready (Port 50051)'}
          </span>
        </div>
      </div>

      {/* Backend Offline Warning */}
      {isBackendConnected === false && (
        <div className="mx-3 mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Local daemon offline. Check backend service.</span>
        </div>
      )}

      <div className="p-3.5 space-y-3.5">
        {/* 2. Active Dataset Folder Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Dataset Folder</span>
            </span>

            {datasetScan?.valid && (
              <button
                onClick={handleBrowseFolder}
                className="text-[10px] text-[var(--accent-coral)] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium flex items-center space-x-1"
                title="Change dataset folder"
              >
                <FolderSync className="w-3 h-3" />
                <span>Change</span>
              </button>
            )}
          </div>

          {datasetScan && datasetScan.valid ? (
            <div className="space-y-2.5">
              {/* Ready Indicator */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-[11px] font-bold text-emerald-300 truncate">
                        {datasetScan.fileCount.toLocaleString()} images ready
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] truncate">
                        {datasetScan.totalSizeFormatted} • zero cloud upload required
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

                {/* Path Display */}
                <div 
                  className="text-[9px] font-mono text-[var(--text-muted)] truncate bg-[var(--bg-base)]/80 px-2 py-1 rounded border border-[var(--border-color)]/50"
                  title={datasetPath}
                >
                  {datasetPath}
                </div>
              </div>

              {/* Sample Files Preview */}
              {datasetScan.sampleFiles && datasetScan.sampleFiles.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-medium text-[var(--text-muted)] block">
                    Indexed sample files:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {datasetScan.sampleFiles.slice(0, 6).map((file, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-[var(--bg-base)] border border-[var(--border-color)] text-[8.5px] font-mono text-[var(--text-secondary)] truncate max-w-[140px]"
                      >
                        {file}
                      </span>
                    ))}
                    {datasetScan.fileCount > 6 && (
                      <span className="px-1.5 py-0.5 text-[8.5px] font-mono text-[var(--text-muted)]">
                        +{datasetScan.fileCount - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-[10px]">
                {workspacePath === datasetPath ? (
                  <span className="text-emerald-400/90 flex items-center space-x-1 font-mono text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Loaded in Workspace</span>
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] text-[9px] truncate max-w-[130px]">
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
            <div className="space-y-2.5">
              {isScanningDataset ? (
                <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-center space-x-2 text-[11px] text-[var(--text-muted)] font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-coral)]" />
                  <span>Indexing dataset files...</span>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Select the local image folder on your PC. When your remote Python program calls <code className="text-[var(--accent-cyan)] font-mono">renkairo.load_data()</code>, batches stream directly from this folder:
                  </p>

                  {/* Quick Select if IDE workspace is already open */}
                  {workspacePath && workspacePath !== datasetPath && (
                    <button
                      onClick={handleUseCurrentWorkspace}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] font-medium text-emerald-300 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <FolderTree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Use Open Workspace: <b>{rootName || 'Project'}</b></span>
                      </div>
                      <ArrowRight className="w-3 h-3 shrink-0 ml-1" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleBrowseFolder}
                      className="py-2 px-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-coral)] text-[10px] font-semibold text-[var(--text-primary)] flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[var(--accent-coral)]" />
                      <span>Choose Folder</span>
                    </button>

                    <button
                      onClick={handleGenerateSampleDataset}
                      disabled={isGeneratingDataset}
                      className="py-2 px-2.5 rounded-lg bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/30 hover:bg-[var(--accent-coral)]/20 text-[10px] font-semibold text-[var(--accent-coral)] flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingDataset ? 'Creating...' : 'Use Demo Data'}</span>
                    </button>
                  </div>

                  {datasetScan && !datasetScan.valid && datasetPath && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] flex items-center space-x-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />
                      <span>No images found (.jpg, .png, .npy). Choose a folder containing images.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. Live Streaming Transfer Monitor (Shows whenever client streams) */}
        {(isStreaming || (telemetry && telemetry.totalBatchesSent > 0)) && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 space-y-2.5 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>On-Demand Stream Activity</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400">
                {telemetry?.pipelineState || 'ACTIVE'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--text-muted)] font-mono">
                  Batch #{telemetry?.totalBatchesSent || 0}
                </span>
                <span className="text-[var(--text-primary)] font-bold font-mono">
                  {telemetry?.datasetProgressPct || 0}%
                </span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-[var(--accent-coral)] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, telemetry?.datasetProgressPct || 0)}%` }}
                />
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-center font-mono">
              <div className="bg-[var(--bg-base)] p-1.5 rounded-lg border border-[var(--border-color)]">
                <span className="text-[8.5px] text-[var(--text-muted)] block">Batches Dispatched</span>
                <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                  {telemetry?.totalBatchesSent || 0}
                </span>
              </div>

              <div className="bg-[var(--bg-base)] p-1.5 rounded-lg border border-[var(--border-color)]">
                <span className="text-[8.5px] text-[var(--text-muted)] block">Data Transferred</span>
                <span className="text-xs font-bold text-[var(--accent-cyan)] block mt-0.5">
                  {((telemetry?.totalBytesSent || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>

            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-300 text-[9px] text-center font-medium">
              ⚡ Transferring batches on-demand to remote Python runtime
            </div>
          </div>
        )}

        {/* 4. Python Usage Snippet Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center space-x-1.5">
              <FileCode className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>Python Integration</span>
            </span>

            <button
              onClick={() => copyCode(pythonSnippet)}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center space-x-1 cursor-pointer bg-transparent border-0 p-0 font-medium"
            >
              {hasCopiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{hasCopiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="relative group">
            <pre className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
              {pythonSnippet}
            </pre>
          </div>

          {/* Quick Scaffold Button */}
          <div className="pt-1">
            <button
              onClick={handleScaffoldCounter}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-coral)]/40 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
            >
              <FileCode className="w-3 h-3 text-[var(--accent-coral)]" />
              <span>{scaffoldStatus || 'Create counter.py in Workspace'}</span>
            </button>
          </div>
        </div>

        {/* 5. System Daemon Info */}
        <div className="p-2.5 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-color)] flex items-center justify-between text-[9px] text-[var(--text-muted)] font-mono">
          <div className="flex items-center space-x-1.5">
            <HardDrive className="w-3 h-3 text-[var(--accent-coral)]" />
            <span>RDTP Streaming Daemon</span>
          </div>
          <span className="text-emerald-400 font-semibold">Active: Port 50051</span>
        </div>
      </div>
    </aside>
  );
};
