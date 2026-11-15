import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Server, 
  Play, 
  Square, 
  RefreshCw, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Wifi, 
  Layers, 
  ArrowRight, 
  Sliders, 
  Database,
  Sparkles,
  Camera
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';
import { Theorem1AuditResult, RDTPSessionConfig, RDTPTelemetryData } from '../../types/ide';

const API_BASE = typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:8000/api' : '/api';

export const RDTPStudioPanel: React.FC = () => {
  const { openFile, setIsRightSidebarOpen, setActiveRightTab } = useIDEStore();

  const [session, setSession] = useState<RDTPSessionConfig>({
    isActive: false,
    workload: 'vit',
    targetEndpoint: '127.0.0.1:50051',
    batchSize: 32,
    bufferDepth: 3,
    codec: 'jpeg',
    uplinkMbps: 40.0,
    dataSource: 'local_dataset',
  });

  const [audit, setAudit] = useState<Theorem1AuditResult | null>(null);
  const [telemetry, setTelemetry] = useState<RDTPTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scaffoldStatus, setScaffoldStatus] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  // Local mathematical calculation of Theorem 1 (fallback when backend server is offline)
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
    } else if (w.includes('diffusion')) {
      rawBytes = cfg.batchSize * 3 * 512 * 512 * 4;
      wireBytes = cfg.codec === 'raw_fp32' ? rawBytes : cfg.batchSize * 145 * 1024;
      tGpuMs = 1420.0;
      tPrepMs = 60.0;
    } else {
      rawBytes = cfg.batchSize * 512 * 4;
      wireBytes = cfg.batchSize * 512 * 2;
      tGpuMs = 340.0;
      tPrepMs = 20.0;
    }
    const bloatRatio = Number((rawBytes / Math.max(wireBytes, 1)).toFixed(2));
    const wireBits = wireBytes * 8;
    const effectiveBps = Math.max(cfg.uplinkMbps, 1) * 1_000_000;
    const tNetMs = Number(((wireBits / effectiveBps) * 1000 + 8.5).toFixed(1));
    const tDmaMs = Number(((rawBytes / (16 * 1024 * 1024 * 1024)) * 1000).toFixed(1));
    const maxUpstream = Math.max(tPrepMs, tNetMs, tDmaMs);
    const isComputeBound = maxUpstream <= tGpuMs;
    const bottleneckStage = isComputeBound ? 'GPU_COMPUTE' : (maxUpstream === tNetMs ? 'WAN_NETWORK' : 'CPU_PREPROCESS');
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
      bottleneckStage,
      sustainableThroughputBatchesPerSec: throughput,
      predictedGpuDutyCyclePct: predictedDutyCycle,
      recommendation: isComputeBound
        ? `Theorem 1 Satisfied: Pipeline is compute-bound (T_gpu=${tGpuMs}ms >= T_net=${tNetMs}ms). Upstream ingestion latency is completely masked.`
        : `Warning: Pipeline is network-bound (T_net=${tNetMs}ms > T_gpu=${tGpuMs}ms). GPU starvation bubbles will occur (~${predictedDutyCycle}% duty cycle). Remedy: Increase batch size, apply higher compression, or upgrade uplink.`,
    };
  };

  // Poll or fetch status
  const fetchStatus = async () => {
    const res = await fetch(`${API_BASE}/rdtp/status`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        if (data.session) setSession(data.session);
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
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

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
      if (data) {
        setAudit(data);
      } else {
        setAudit(computeLocalAudit(updated));
      }
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
        // Open directly in Monaco editor
        if (data.fullPath && data.filename) {
          openFile(data.fullPath, data.filename);
        }
      } else {
        setScaffoldStatus('Failed to scaffold template');
      }
    } else {
      setScaffoldStatus('Failed to scaffold template');
    }
  };

  const openTelemetryDeck = () => {
    setIsRightSidebarOpen(true);
    setActiveRightTab('RDTP_TELEMETRY');
  };

  const workloads = [
    { id: 'vit', name: 'Vision Transformer (ViT-B/16)', desc: 'Compute-intensive, optimal for streaming' },
    { id: 'resnet', name: 'ResNet-50 (ImageNet)', desc: 'Fast CNN steps, requires 100+ Mbps or high compression' },
    { id: 'diffusion', name: 'Stable Diffusion Latents', desc: '512x512 latent training with WebP encoding' },
    { id: 'roberta', name: 'RoBERTa-Large (NLP)', desc: 'Tokenized uint16 sequences, minimal WAN footprint' },
  ];

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150 overflow-y-auto">
      {/* Studio Header */}
      <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/30 flex items-center justify-center">
              <ToriiIcon color="var(--accent-coral)" className="w-4 h-4 drop-shadow-[0_0_6px_var(--glow-coral)]" />
            </div>
            <div>
              <h2 className="text-xs font-bold font-mono tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5">
                <span>RDTP ML STUDIO</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-coral)]/20 text-[var(--accent-coral)] font-bold">
                  v1.0
                </span>
              </h2>
              <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                リアルタイム分散学習プロトコル
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                session.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            <span className="text-[10px] font-mono font-semibold uppercase text-[var(--text-muted)]">
              {session.isActive ? 'STREAMING' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Backend Offline Indicator */}
        {isBackendConnected === false && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono flex items-center justify-between">
            <div className="flex items-center space-x-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Backend offline (port 8000). Run: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-bold">npm run server</code></span>
            </div>
            <span className="text-[8px] bg-amber-500/20 px-1 py-0.5 rounded font-bold shrink-0 ml-1">LOCAL SIM</span>
          </div>
        )}

        {/* Global Stream Control Bar */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={handleToggleStream}
            disabled={isLoading}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm ${
              session.isActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-400/40'
            }`}
          >
            {session.isActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP STREAMING</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START RDTP STREAM</span>
              </>
            )}
          </button>

          <button
            onClick={openTelemetryDeck}
            className="p-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] rounded-lg transition-colors cursor-pointer"
            title="Open Live Pipeline Telemetry in Right Deck"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Workload Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
            <span>Target ML Architecture</span>
            <span className="text-[9px] text-[var(--accent-coral)]">Auto-Tuned</span>
          </label>
          <div className="space-y-1">
            {workloads.map((w) => (
              <button
                key={w.id}
                onClick={() => handleConfigChange({ workload: w.id })}
                className={`w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                  session.workload === w.id
                    ? 'bg-[var(--accent-coral)]/10 border-[var(--accent-coral)] text-[var(--text-primary)] shadow-sm'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color-hover)]'
                }`}
              >
                <div className="font-semibold font-mono flex items-center justify-between">
                  <span>{w.name}</span>
                  {session.workload === w.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-coral)]" />
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                  {w.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Network & Protocol Parameters */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-2.5 shadow-sm font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>Transport & Ring Buffer</span>
            </span>
            <span className="text-[9px] text-[var(--accent-cyan)]">gRPC TLS 1.3</span>
          </div>

          {/* Cloud Accelerator Endpoint */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>Cloud Consumer Endpoint</span>
              <span className="text-emerald-400">Port 50051</span>
            </div>
            <input
              type="text"
              value={session.targetEndpoint}
              onChange={(e) => handleConfigChange({ targetEndpoint: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-coral)]"
              placeholder="e.g. 127.0.0.1:50051 or cloud-gpu:50051"
            />
          </div>

          {/* Uplink Bandwidth Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>WAN Residential Uplink</span>
              <span className="text-[var(--accent-coral)] font-bold">{session.uplinkMbps} Mbps</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={session.uplinkMbps}
              onChange={(e) => handleConfigChange({ uplinkMbps: Number(e.target.value) })}
              className="w-full accent-[var(--accent-coral)] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-subtle)]">
              <span>10 Mbps (DSL)</span>
              <span>40 Mbps (Standard)</span>
              <span>200 Mbps (Fiber)</span>
            </div>
          </div>

          {/* Circular Pinned Ring Buffer Depth */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>Pinned Ring Buffer Depth (N)</span>
              <span className="text-[var(--accent-cyan)] font-bold">{session.bufferDepth} Batches</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={session.bufferDepth}
              onChange={(e) => handleConfigChange({ bufferDepth: Number(e.target.value) })}
              className="w-full accent-[var(--accent-cyan)] cursor-pointer"
            />
            <div className="text-[9px] text-[var(--text-subtle)]">
              Slots allocated in CUDA pinned memory (Credit limit C = {session.bufferDepth})
            </div>
          </div>

          {/* Domain-Specific Codec */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>Edge Domain Codec</span>
              <span className="text-amber-400 uppercase font-semibold">{session.codec}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'jpeg', label: 'JPEG (17.5x)', note: 'Images' },
                { id: 'webp', label: 'WebP (24x)', note: 'Latents' },
                { id: 'uint16', label: 'uint16', note: 'NLP Tokens' },
                { id: 'raw_fp32', label: 'Raw FP32', note: 'Baseline' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleConfigChange({ codec: c.id })}
                  className={`p-1.5 rounded text-[10px] border transition-colors cursor-pointer text-left ${
                    session.codec === c.id
                      ? 'bg-[var(--accent-coral)]/15 border-[var(--accent-coral)] text-[var(--text-primary)] font-bold'
                      : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div className="truncate">{c.label}</div>
                  <div className="text-[8px] text-[var(--text-subtle)]">{c.note}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Theorem 1 Mathematical Formulation & Live Audit Card */}
        {audit && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-2 shadow-sm font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Theorem 1 Pipeline Audit</span>
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  audit.isComputeBound
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                {audit.isComputeBound ? 'COMPUTE-BOUND' : 'I/O-BOUND'}
              </span>
            </div>

            {/* Formula display */}
            <div className="bg-[var(--bg-base)] p-2 rounded border border-[var(--border-color)] text-center text-[11px] font-bold text-[var(--text-primary)]">
              max(T_p, T_n, T_d) ≤ T_g
            </div>

            {/* Latency Breakdown Bar */}
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
              <div className="bg-[var(--bg-base)] p-1 rounded border border-[var(--border-color)]">
                <span className="text-[var(--text-subtle)] block text-[8px]">T_prep</span>
                <span className="font-bold text-[var(--text-primary)]">{audit.timings.tPrepMs}ms</span>
              </div>
              <div className={`bg-[var(--bg-base)] p-1 rounded border ${audit.timings.tNetMs > audit.timings.tGpuMs ? 'border-rose-500/50 text-rose-400' : 'border-[var(--border-color)] text-[var(--text-primary)]'}`}>
                <span className="text-[var(--text-subtle)] block text-[8px]">T_net</span>
                <span className="font-bold">{audit.timings.tNetMs}ms</span>
              </div>
              <div className="bg-[var(--bg-base)] p-1 rounded border border-[var(--border-color)]">
                <span className="text-[var(--text-subtle)] block text-[8px]">T_dma</span>
                <span className="font-bold text-[var(--text-primary)]">{audit.timings.tDmaMs}ms</span>
              </div>
              <div className="bg-[var(--bg-base)] p-1 rounded border border-[var(--accent-cyan)]/40">
                <span className="text-[var(--accent-cyan)] block text-[8px]">T_gpu</span>
                <span className="font-bold text-[var(--accent-cyan)]">{audit.timings.tGpuMs}ms</span>
              </div>
            </div>

            {/* Audit Status & Recommendation */}
            <div className="text-[10px] text-[var(--text-muted)] space-y-1 pt-1 border-t border-[var(--border-color)]">
              <div className="flex justify-between">
                <span>Wire Compression:</span>
                <span className="font-bold text-emerald-400">{audit.bloatRatio}× Bloat Eliminated</span>
              </div>
              <div className="flex justify-between">
                <span>Predicted GPU Duty Cycle:</span>
                <span className="font-bold text-[var(--accent-coral)]">{audit.predictedGpuDutyCyclePct}%</span>
              </div>
              <div className="flex justify-between">
                <span>Ingestion Throughput:</span>
                <span className="font-bold text-[var(--text-primary)]">{audit.sustainableThroughputBatchesPerSec} batches/sec</span>
              </div>
              <p className="text-[9px] text-[var(--text-subtle)] italic pt-1 leading-normal">
                {audit.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Starter Template Scaffolding */}
        <div className="space-y-1.5 font-mono text-xs">
          <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
            <span>PyTorch Starter Templates</span>
            <FileCode className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
          </label>

          {scaffoldStatus && (
            <div className="p-1.5 text-[10px] rounded bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 text-center animate-pulse">
              {scaffoldStatus}
            </div>
          )}

          <div className="space-y-1">
            {[
              { id: 'vit', title: 'Vision Transformer (train_vit_rdtp.py)', desc: 'ViT-B/16 streaming trainer' },
              { id: 'resnet', title: 'ResNet-50 (train_resnet_rdtp.py)', desc: 'ImageNet CNN streaming trainer' },
              { id: 'webcam', title: 'Active Learning (train_webcam_active_learning.py)', desc: '60 FPS DirectShow/V4L2 peripheral' },
              { id: 'consumer', title: 'Cloud Consumer (rdtp_consumer_worker.py)', desc: 'Remote ring-buffer GPU worker' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleScaffold(t.id)}
                className="w-full text-left p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <div className="truncate pr-2">
                  <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-cyan)]">
                    {t.title}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] truncate">
                    {t.desc}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-subtle)] group-hover:text-[var(--accent-cyan)] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Link to Full Observability Deck */}
        <div className="pt-2">
          <button
            onClick={openTelemetryDeck}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--accent-coral)]/60 text-xs font-mono text-[var(--text-primary)] flex items-center justify-between transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[var(--accent-coral)]" />
              <span className="font-semibold">Open Live Pipeline Telemetry</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-coral)] group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </aside>
  );
};
