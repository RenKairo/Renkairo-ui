import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  X, 
  Terminal, 
  Wifi, 
  Copy, 
  Check, 
  ArrowRight, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  LogIn, 
  KeyRound,
  Globe,
  Loader2,
  Activity,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { ToriiIcon } from './ToriiIcon';
import { 
  getBackendBaseUrl, 
  setBackendBaseUrl, 
  testBackendHttpConnection, 
  BackendConnectionTestResult,
  DEFAULT_BACKEND_URL
} from '../../services/apiConfig';

const RECENT_SSH_HOSTS_STORAGE_KEY = 'renkairo_recent_ssh_hosts';
const RECENT_HTTP_HOSTS_STORAGE_KEY = 'renkairo_recent_http_hosts';

export const ConnectServerModal: React.FC = () => {
  const { 
    isConnectServerModalOpen, 
    setConnectServerModalOpen, 
    requestTerminalSession,
    setTerminalHeight,
    terminalHeight,
    setRemoteServerConnected
  } = useIDEStore();

  const { 
    user: authUser, 
    token: authToken, 
    isAuthenticated, 
    setAuthModalOpen,
    logout
  } = useAuthStore();

  // Mode: 'http' for direct Shiro Backend REST API (Port 8080), or 'ssh' for Linux Terminal Shell (Port 22)
  const [connectionMode, setConnectionMode] = useState<'http' | 'ssh'>('http');

  // --- HTTP Backend State (Port 8080) ---
  const currentSavedBackendUrl = getBackendBaseUrl();
  const [httpProtocol, setHttpProtocol] = useState<'http' | 'https'>(
    currentSavedBackendUrl.startsWith('https') ? 'https' : 'http'
  );
  const [httpHost, setHttpHost] = useState(() => {
    try {
      const u = new URL(currentSavedBackendUrl);
      return u.hostname;
    } catch {
      return 'localhost';
    }
  });
  const [httpPort, setHttpPort] = useState(() => {
    try {
      const u = new URL(currentSavedBackendUrl);
      return u.port || (u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? '8080' : '');
    } catch {
      return '';
    }
  });
  const [httpTesting, setHttpTesting] = useState(false);
  const [httpTestResult, setHttpTestResult] = useState<BackendConnectionTestResult | null>(null);
  const [recentHttpHosts, setRecentHttpHosts] = useState<string[]>([]);
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);
  const [demoLoginError, setDemoLoginError] = useState<string | null>(null);

  // --- SSH Shell State (Port 22) ---
  const [sshHost, setSshHost] = useState('');
  const [sshUser, setSshUser] = useState(authUser?.username || 'Azhar');
  const [sshPort, setSshPort] = useState('22');
  const [sshPassword, setSshPassword] = useState('');
  const [sshWorkspaceName, setSshWorkspaceName] = useState('default');
  const [copied, setCopied] = useState(false);
  const [recentSshHosts, setRecentSshHosts] = useState<string[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Update default SSH user whenever auth user updates
  useEffect(() => {
    if (authUser?.username) {
      setSshUser(authUser.username);
    }
  }, [authUser]);

  // Load recent hosts from localStorage
  useEffect(() => {
    try {
      const savedSsh = localStorage.getItem(RECENT_SSH_HOSTS_STORAGE_KEY);
      if (savedSsh) {
        const parsed = JSON.parse(savedSsh);
        if (Array.isArray(parsed)) setRecentSshHosts(parsed);
      } else {
        setRecentSshHosts(['192.168.1.120', '192.168.0.50', '10.0.0.15']);
      }
    } catch (e) {}

    try {
      const savedHttp = localStorage.getItem(RECENT_HTTP_HOSTS_STORAGE_KEY);
      if (savedHttp) {
        const parsed = JSON.parse(savedHttp);
        if (Array.isArray(parsed)) setRecentHttpHosts(parsed);
      } else {
        setRecentHttpHosts([
          DEFAULT_BACKEND_URL,
          'http://192.168.1.120:8080',
          'http://renkairo.duckdns.org:8080'
        ]);
      }
    } catch (e) {}
  }, []);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isConnectServerModalOpen) {
      setHttpTestResult(null);
      setProvisionError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isConnectServerModalOpen, connectionMode]);

  // Handle global Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConnectServerModalOpen && !isProvisioning) {
        setConnectServerModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnectServerModalOpen, isProvisioning, setConnectServerModalOpen]);

  if (!isConnectServerModalOpen) return null;

  // Clean and construct HTTP Target URL
  const cleanHttpHost = httpHost.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  const cleanHttpPort = httpPort.trim();
  const constructedHttpUrl = cleanHttpPort 
    ? `${httpProtocol}://${cleanHttpHost || 'localhost'}:${cleanHttpPort}`
    : `${httpProtocol}://${cleanHttpHost || 'localhost'}`;

  // Helper when user pastes full URL into host box
  const handleHttpHostChange = (val: string) => {
    let clean = val.trim();
    if (/^https?:\/\//i.test(clean)) {
      try {
        const u = new URL(clean);
        setHttpProtocol(u.protocol.replace(':', '') as 'http' | 'https');
        setHttpHost(u.hostname);
        setHttpPort(u.port || '');
        return;
      } catch (e) {}
    }
    clean = clean.replace(/\/.*$/, '');
    if (clean.includes(':')) {
      const parts = clean.split(':');
      setHttpHost(parts[0]);
      setHttpPort(parts[1] || '');
      return;
    }
    if (clean.includes('.') && httpPort === '8080') {
      setHttpPort('');
    }
    setHttpHost(clean);
  };

  // ---------------------------------------------------------------------------
  // Action: Connect via HTTP (Shiro Backend - Port 8080)
  // ---------------------------------------------------------------------------
  const handleConnectHttp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanHttpHost) return;

    setHttpTesting(true);
    setHttpTestResult(null);
    setDemoLoginError(null);

    const result = await testBackendHttpConnection(constructedHttpUrl, authToken);
    setHttpTesting(false);
    setHttpTestResult(result);

    if (result.serverReachable || result.ok) {
      setBackendBaseUrl(constructedHttpUrl);
      setRemoteServerConnected(true, constructedHttpUrl, cleanHttpHost || 'Shiro Linux Server');

      const updated = [constructedHttpUrl, ...recentHttpHosts.filter((h) => h !== constructedHttpUrl)].slice(0, 5);
      setRecentHttpHosts(updated);
      try {
        localStorage.setItem(RECENT_HTTP_HOSTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {}

      if (result.tokenValid) {
        setTimeout(() => {
          setConnectServerModalOpen(false);
        }, 1200);
      }
    }
  };

  // Quick Developer Demo Login directly against the configured server
  const handleQuickDemoLogin = async () => {
    if (!cleanHttpHost) return;
    setIsDemoLoggingIn(true);
    setDemoLoginError(null);
    try {
      setBackendBaseUrl(constructedHttpUrl);
      setRemoteServerConnected(true, constructedHttpUrl, cleanHttpHost || 'Shiro Linux Server');
      await authService.login('developer@renkairo.io', 'renkairo2026');

      const newToken = useAuthStore.getState().token;
      const res = await testBackendHttpConnection(constructedHttpUrl, newToken);
      setHttpTestResult(res);

      const updated = [constructedHttpUrl, ...recentHttpHosts.filter((h) => h !== constructedHttpUrl)].slice(0, 5);
      setRecentHttpHosts(updated);
      try {
        localStorage.setItem(RECENT_HTTP_HOSTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {}

      setTimeout(() => {
        setConnectServerModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setDemoLoginError(err.message || 'Demo login failed');
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action: Connect via SSH Terminal (Linux Shell - Port 22)
  // ---------------------------------------------------------------------------
  const targetSshHost = sshHost.trim();
  const targetSshUser = sshUser.trim() || 'Azhar';
  const targetSshPort = sshPort.trim() || '22';

  const sshCommand = targetSshPort !== '22'
    ? `ssh -p ${targetSshPort} ${targetSshUser}@${targetSshHost || '[ipaddress]'}`
    : `ssh ${targetSshUser}@${targetSshHost || '[ipaddress]'}`;

  const copyCommand = () => {
    if (!targetSshHost) return;
    navigator.clipboard.writeText(sshCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleConnectSsh = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetSshHost || isProvisioning) return;

    const activeToken = authToken || '';
    const activeUser = authUser || {
      userId: 'usr_guest',
      username: targetSshUser || 'developer',
      email: 'guest@renkairo.io',
      role: 'DEVELOPER'
    };

    setIsProvisioning(true);
    setProvisionError(null);

    const updated = [targetSshHost, ...recentSshHosts.filter((h) => h !== targetSshHost)].slice(0, 5);
    setRecentSshHosts(updated);
    try {
      localStorage.setItem(RECENT_SSH_HOSTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {}

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
    const apiBase = isFileProtocol ? 'http://localhost:8000/api' : '/api';

    try {
      const response = await fetch(`${apiBase}/ssh/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: targetSshHost,
          user: targetSshUser,
          port: parseInt(targetSshPort, 10) || 22,
          password: sshPassword.trim(),
          workspaceName: sshWorkspaceName.trim() || 'default',
          workspaceId: sshWorkspaceName.trim() || 'default',
          isolationMode: 'isolated_directory'
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Provisioning failed with status ${response.status}`);
      }

      const resData = await response.json();
      console.log('[RenKairo Provisioning Engine] Workspace provisioned:', resData);

      if (terminalHeight < 240) {
        setTerminalHeight(280);
      }

      requestTerminalSession({
        shellType: 'ssh',
        name: `SSH: ${targetSshUser}@${targetSshHost}`,
        sshConfig: {
          host: targetSshHost,
          user: targetSshUser,
          port: parseInt(targetSshPort, 10) || 22,
          workspaceId: sshWorkspaceName.trim() || 'default',
          workspaceName: sshWorkspaceName.trim() || 'default',
          password: sshPassword.trim(),
          token: activeToken,
          userId: activeUser.userId,
          accountUsername: activeUser.username,
          userRole: activeUser.role,
          authHeader: `Bearer ${activeToken}`
        }
      });

      setConnectServerModalOpen(false);
    } catch (err: any) {
      console.error('[Provisioning Error]:', err);
      setProvisionError(err.message || 'Remote workspace provisioning failed');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={() => setConnectServerModalOpen(false)}
    >
      <div 
        className="w-full max-w-lg bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Header --- */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center p-1.5 shadow-sm">
              <ToriiIcon color="var(--accent-coral)" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight tracking-wide">
                Connect Server
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Target Shiro backend API or remote terminal shell
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-[var(--text-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-base)]">
              ESC
            </span>
            <button
              onClick={() => setConnectServerModalOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- Segmented Mode Switcher --- */}
        <div className="px-5 pt-3.5 pb-1">
          <div className="p-1 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setConnectionMode('http')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                connectionMode === 'http'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${connectionMode === 'http' ? 'text-[var(--accent-coral)]' : ''}`} />
              <span>HTTP REST API</span>
            </button>

            <button
              type="button"
              onClick={() => setConnectionMode('ssh')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                connectionMode === 'ssh'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Terminal className={`w-3.5 h-3.5 ${connectionMode === 'ssh' ? 'text-[var(--accent-coral)]' : ''}`} />
              <span>SSH Shell (Port 22)</span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TAB 1: HTTP BACKEND (REST API)                                   */}
        {/* ================================================================ */}
        {connectionMode === 'http' && (
          <form onSubmit={handleConnectHttp} className="p-5 space-y-4 text-xs">
            {/* Account Status Pill */}
            {isAuthenticated && authUser ? (
              <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="text-[var(--text-primary)] font-semibold">{authUser.username}</span>
                    <span className="text-[var(--text-muted)] text-[10px] ml-1.5 font-normal">
                      ({authUser.role || 'DEVELOPER'})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2 py-1 rounded-lg text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer shrink-0"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--accent-coral)] shrink-0" />
                  <span className="text-[11px]">Unauthenticated Session</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={isDemoLoggingIn}
                  className="px-2.5 py-1 rounded-lg bg-[var(--accent-coral)]/15 border border-[var(--accent-coral)]/30 text-[var(--accent-coral)] text-[10px] font-semibold hover:bg-[var(--accent-coral)]/25 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isDemoLoggingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                  <span>Developer Sign In</span>
                </button>
              </div>
            )}

            {/* Seamless Unified Address Bar Group */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Server Endpoint Address
              </label>

              <div className="flex rounded-xl overflow-hidden border border-[var(--border-color)] focus-within:border-[var(--accent-coral)] focus-within:ring-1 focus-within:ring-[var(--accent-coral)]/40 transition-all shadow-sm bg-[var(--bg-input)]">
                {/* Protocol selector */}
                <select
                  value={httpProtocol}
                  onChange={(e) => {
                    const nextProto = e.target.value as 'http' | 'https';
                    setHttpProtocol(nextProto);
                    if (nextProto === 'https' && httpPort === '8080') {
                      setHttpPort('');
                    }
                  }}
                  className="bg-[var(--bg-card)] border-r border-[var(--border-color)] px-2.5 py-2 text-xs text-[var(--text-secondary)] focus:outline-none cursor-pointer select-none shrink-0"
                >
                  <option value="http">http://</option>
                  <option value="https">https://</option>
                </select>

                {/* Host / IP input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={httpHost}
                  onChange={(e) => handleHttpHostChange(e.target.value)}
                  placeholder="192.168.1.120 or hostname"
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none min-w-0"
                />

                {/* Port separator & port input */}
                <div className="flex items-center bg-[var(--bg-card)] border-l border-[var(--border-color)] px-2.5 shrink-0">
                  <span className="text-[var(--text-subtle)] text-xs mr-1">:</span>
                  <input
                    type="text"
                    value={httpPort}
                    onChange={(e) => setHttpPort(e.target.value)}
                    placeholder="8080"
                    className="w-14 bg-transparent py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Recent Servers Chips */}
            {recentHttpHosts.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-subtle)] uppercase tracking-wider font-semibold">
                  <Clock className="w-3 h-3" />
                  <span>Recent Servers</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentHttpHosts.map((recent) => (
                    <button
                      key={recent}
                      type="button"
                      onClick={() => handleHttpHostChange(recent)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all flex items-center space-x-1.5 cursor-pointer ${
                        constructedHttpUrl === recent
                          ? 'bg-[var(--accent-coral)]/15 border-[var(--accent-coral)]/50 text-[var(--accent-coral)] font-semibold'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Globe className="w-2.5 h-2.5 opacity-60" />
                      <span className="truncate max-w-[200px]">{recent.replace(/^https?:\/\//i, '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target URL Preview */}
            <div className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-[11px] shadow-inner">
              <div className="flex items-center space-x-2 truncate pr-2">
                <span className="text-[var(--text-subtle)] select-none font-bold">API</span>
                <span className="text-[var(--text-primary)] font-semibold truncate">{constructedHttpUrl}</span>
              </div>
              <span className="text-[9px] text-[var(--text-subtle)] px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] shrink-0">
                REST / JSON
              </span>
            </div>

            {/* Connection Test Status Banner */}
            {httpTestResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 animate-in fade-in duration-150 ${
                httpTestResult.serverReachable
                  ? httpTestResult.tokenValid 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {httpTestResult.serverReachable ? (
                  httpTestResult.tokenValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>
                      {httpTestResult.serverReachable
                        ? (httpTestResult.tokenValid ? 'Connected & Authenticated' : 'Server Online (Sign In Required)')
                        : 'Connection Failed'}
                    </span>
                    {httpTestResult.latencyMs && (
                      <span className="text-[10px] opacity-75 font-normal">{httpTestResult.latencyMs}ms</span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-80 leading-relaxed break-words">
                    {httpTestResult.serverReachable
                      ? httpTestResult.message || `Shiro Backend responding at ${httpTestResult.serverUrl}`
                      : httpTestResult.error}
                  </p>
                </div>
              </div>
            )}

            {/* Demo Login Error Banner */}
            {demoLoginError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">{demoLoginError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-subtle)]">
                Shiro Port 8080
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setConnectServerModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cleanHttpHost || httpTesting}
                  className={`px-4 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-semibold shadow-md transition-all ${
                    cleanHttpHost && !httpTesting
                      ? 'bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white active:scale-98 cursor-pointer' 
                      : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-subtle)] cursor-not-allowed'
                  }`}
                >
                  {httpTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5" />
                      <span>Save & Connect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================ */}
        {/* TAB 2: SSH TERMINAL SHELL (PORT 22)                              */}
        {/* ================================================================ */}
        {connectionMode === 'ssh' && (
          <form onSubmit={handleConnectSsh} className="p-5 space-y-4 text-xs">
            {/* Account Status Pill */}
            {isAuthenticated && authUser ? (
              <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="text-[var(--text-primary)] font-semibold">{authUser.username}</span>
                    <span className="text-[var(--text-muted)] text-[10px] ml-1.5 font-normal">
                      ({authUser.role || 'DEVELOPER'})
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Session Active</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-medium">Authentication recommended</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConnectServerModalOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--accent-coral)] text-white text-[10px] font-semibold hover:bg-[var(--accent-coral-hover)] transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign In</span>
                </button>
              </div>
            )}

            {/* Host & Port Row */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="col-span-3 space-y-1.5">
                <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Server Host / IP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    placeholder="192.168.1.120"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/40 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none shadow-sm pr-8 transition-all"
                  />
                  <Wifi className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-center">
                  Port
                </label>
                <input
                  type="text"
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                  placeholder="22"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/40 rounded-xl px-2 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none shadow-sm text-center font-bold transition-all"
                />
              </div>
            </div>

            {/* User & Password Row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Linux User
                </label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  placeholder="Azhar"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/40 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none shadow-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Password <span className="opacity-60 font-normal">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={sshPassword}
                  onChange={(e) => setSshPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/40 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Workspace Scope */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Workspace Scope Name
              </label>
              <input
                type="text"
                value={sshWorkspaceName}
                onChange={(e) => setSshWorkspaceName(e.target.value)}
                placeholder="default"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-coral)] focus:ring-1 focus:ring-[var(--accent-coral)]/40 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none shadow-sm transition-all"
              />
            </div>

            {/* CLI Command Preview Box */}
            <div className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-[11px] shadow-inner">
              <div className="flex items-center space-x-2 truncate pr-2">
                <span className="text-[var(--text-subtle)] select-none font-bold">$</span>
                <span className="text-[var(--text-primary)] font-semibold truncate font-mono">{sshCommand}</span>
              </div>
              {targetSshHost && (
                <button
                  type="button"
                  onClick={copyCommand}
                  className="px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                  title="Copy command"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Provisioning Error Banner */}
            {provisionError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-[11px] text-rose-400 flex items-start space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1 break-words">{provisionError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-subtle)]">
                Direct SSH (Port 22)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isProvisioning}
                  onClick={() => setConnectServerModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium text-xs disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetSshHost || isProvisioning}
                  className={`px-4 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-semibold shadow-md transition-all ${
                    targetSshHost && !isProvisioning
                      ? 'bg-[var(--accent-coral)] hover:bg-[var(--accent-coral-hover)] text-white active:scale-98 cursor-pointer' 
                      : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-subtle)] cursor-not-allowed'
                  }`}
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5" />
                      <span>Connect Terminal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
