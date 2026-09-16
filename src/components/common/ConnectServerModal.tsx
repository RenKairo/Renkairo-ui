import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  X, 
  Terminal, 
  Wifi, 
  ShieldCheck, 
  Copy, 
  Check, 
  ArrowRight,
  Clock,
  Laptop
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from './ToriiIcon';

const RECENT_HOSTS_STORAGE_KEY = 'renkairo_recent_ssh_hosts';

export const ConnectServerModal: React.FC = () => {
  const { 
    isConnectServerModalOpen, 
    setConnectServerModalOpen, 
    requestTerminalSession,
    setTerminalHeight,
    terminalHeight
  } = useIDEStore();

  const [host, setHost] = useState('');
  const [user, setUser] = useState('Azhar');
  const [port, setPort] = useState('22');
  const [copied, setCopied] = useState(false);
  const [recentHosts, setRecentHosts] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent LAN / remote hosts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_HOSTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentHosts(parsed);
        }
      } else {
        // Helpful defaults for LAN network setup
        setRecentHosts(['192.168.1.120', '192.168.0.50', '10.0.0.15']);
      }
    } catch (e) {}
  }, []);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isConnectServerModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isConnectServerModalOpen]);

  // Handle global Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConnectServerModalOpen) {
        setConnectServerModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnectServerModalOpen, setConnectServerModalOpen]);

  if (!isConnectServerModalOpen) return null;

  const targetHost = host.trim();
  const targetUser = user.trim() || 'Azhar';
  const targetPort = port.trim() || '22';

  // Construct CLI SSH command preview
  const sshCommand = targetPort !== '22'
    ? `ssh -p ${targetPort} ${targetUser}@${targetHost || '[ipaddress]'}`
    : `ssh ${targetUser}@${targetHost || '[ipaddress]'}`;

  const copyCommand = () => {
    if (!targetHost) return;
    navigator.clipboard.writeText(sshCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleConnect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetHost) return;

    // Save to recent hosts history
    const updated = [targetHost, ...recentHosts.filter((h) => h !== targetHost)].slice(0, 6);
    setRecentHosts(updated);
    try {
      localStorage.setItem(RECENT_HOSTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {}

    // Ensure bottom terminal panel has comfortable height
    if (terminalHeight < 240) {
      setTerminalHeight(280);
    }

    // Dispatch terminal session request
    requestTerminalSession({
      shellType: 'ssh',
      name: `SSH: ${targetUser}@${targetHost}`,
      sshConfig: {
        host: targetHost,
        user: targetUser,
        port: parseInt(targetPort, 10) || 22
      }
    });

    // Close modal sheet
    setConnectServerModalOpen(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 select-none animate-in fade-in duration-150"
      onClick={() => setConnectServerModalOpen(false)}
    >
      <div 
        className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center relative overflow-hidden group p-1 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-coral)]/20 to-transparent opacity-60"></div>
              <ToriiIcon color="var(--accent-coral)" className="w-4 h-4 z-10 drop-shadow-[0_0_6px_var(--glow-coral)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center space-x-1.5 font-mono">
                <span>Connect Remote Server</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)] font-mono font-bold">
                  SSH / LAN
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Launch an interactive SSH terminal in the bottom panel
              </p>
            </div>
          </div>

          <button
            onClick={() => setConnectServerModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleConnect} className="p-4 space-y-4 text-xs font-sans">
          {/* Target Host (IP Address) Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Server IP Address or Hostname <span className="text-[var(--accent-coral)]">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. 192.168.1.120 or hostname.local"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none shadow-sm pr-9 transition-colors"
              />
              <Wifi className="w-4 h-4 text-[var(--accent-cyan)] absolute right-3 top-2.5 pointer-events-none opacity-80" />
            </div>
          </div>

          {/* User & Port Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Username Field */}
            <div className="col-span-2 space-y-1.5">
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Remote User
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Azhar"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm transition-colors"
              />
            </div>

            {/* Port Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Port
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="22"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm transition-colors text-center"
              />
            </div>
          </div>

          {/* Quick Select Recent LAN IPs */}
          {recentHosts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] font-mono uppercase font-semibold">
                <Clock className="w-3 h-3 text-[var(--text-subtle)]" />
                <span>Recent LAN Hosts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentHosts.map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    onClick={() => setHost(recent)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-all flex items-center space-x-1 ${
                      host === recent
                        ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-semibold'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Laptop className="w-3 h-3 text-[var(--text-subtle)]" />
                    <span>{recent}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Command Preview Box */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono uppercase font-semibold">
              <span className="flex items-center space-x-1">
                <Terminal className="w-3 h-3 text-[var(--accent-coral)]" />
                <span>Executed CLI Command</span>
              </span>
              {targetHost && (
                <button
                  type="button"
                  onClick={copyCommand}
                  className="hover:text-[var(--accent-cyan)] flex items-center space-x-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <div className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg font-mono text-[11px] text-[var(--accent-cyan)] flex items-center justify-between shadow-inner">
              <div className="truncate pr-2">
                <span className="text-[var(--text-subtle)] mr-2 select-none">$</span>
                <span className="font-semibold text-emerald-400">ssh </span>
                {targetPort !== '22' && (
                  <span className="text-amber-400">-p {targetPort} </span>
                )}
                <span className="text-[var(--accent-coral)] font-bold">{targetUser}</span>
                <span className="text-[var(--text-subtle)]">@</span>
                <span className="text-[var(--accent-cyan)] font-semibold">
                  {targetHost || <span className="text-[var(--text-subtle)]">[ipaddress]</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Helpful Information Pill */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[var(--text-secondary)] font-medium">Interactive LAN Authentication</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                The virtual terminal will open in the bottom panel. Enter your password when prompted by the server to start executing remote commands.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setConnectServerModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetHost}
              className={`px-4 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-semibold shadow-md transition-all font-mono ${
                targetHost 
                  ? 'bg-gradient-to-r from-[var(--accent-coral)] to-[var(--accent-cyan)] text-white hover:opacity-95 active:scale-98 cursor-pointer' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-subtle)] cursor-not-allowed'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Connect & Open Terminal</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
