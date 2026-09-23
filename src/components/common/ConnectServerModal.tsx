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
  Laptop, 
  UserCheck, 
  AlertTriangle, 
  LogIn, 
  KeyRound,
  Globe,
  Loader2,
  Activity,
  CheckCircle2,
  AlertCircle
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
    terminalHeight
  } = useIDEStore();

  const { 
    user: authUser, 
    token: authToken, 
    isAuthenticated, 
    setAuthModalOpen 
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
      return u.port || '8080';
    } catch {
      return '8080';
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
  const cleanHttpHost = httpHost.trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '');
  const cleanHttpPort = httpPort.trim() || '8080';
  const constructedHttpUrl = `${httpProtocol}://${cleanHttpHost || 'localhost'}:${cleanHttpPort}`;

  // Helper when user pastes full URL into host box
  const handleHttpHostChange = (val: string) => {
    let clean = val.trim();
    if (/^https?:\/\//i.test(clean)) {
      try {
        const u = new URL(clean);
        setHttpProtocol(u.protocol.replace(':', '') as 'http' | 'https');
        setHttpHost(u.hostname);
        if (u.port) setHttpPort(u.port);
        return;
      } catch (e) {}
    }
    if (clean.includes(':')) {
      const parts = clean.split(':');
      setHttpHost(parts[0]);
      if (parts[1]) setHttpPort(parts[1]);
      return;
    }
    setHttpHost(val);
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
      // Save backend URL in config & localStorage so all future API calls point here
      setBackendBaseUrl(constructedHttpUrl);

      // Update recent HTTP hosts
      const updated = [constructedHttpUrl, ...recentHttpHosts.filter((h) => h !== constructedHttpUrl)].slice(0, 6);
      setRecentHttpHosts(updated);
      try {
        localStorage.setItem(RECENT_HTTP_HOSTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {}

      // Automatically close modal after brief confirmation if token is valid
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
      // Save backend URL first so authService.login posts directly to this server
      setBackendBaseUrl(constructedHttpUrl);
      await authService.login('developer@renkairo.io', 'renkairo2026');

      // Verify connection with new real token
      const newToken = useAuthStore.getState().token;
      const res = await testBackendHttpConnection(constructedHttpUrl, newToken);
      setHttpTestResult(res);

      const updated = [constructedHttpUrl, ...recentHttpHosts.filter((h) => h !== constructedHttpUrl)].slice(0, 6);
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

    // Ensure developer authentication session is active without prompting user
    const devAuth = useAuthStore.getState().ensureDevAuth();
    const activeToken = authToken || devAuth.token;
    const activeUser = authUser || devAuth.user;

    setIsProvisioning(true);
    setProvisionError(null);

    const updated = [targetSshHost, ...recentSshHosts.filter((h) => h !== targetSshHost)].slice(0, 6);
    setRecentSshHosts(updated);
    try {
      localStorage.setItem(RECENT_SSH_HOSTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {}

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
    const apiBase = isFileProtocol ? 'http://localhost:8000/api' : '/api';

    try {
      // 1. Issue HTTP Provisioning Request to backend
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
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 select-none animate-in fade-in duration-150"
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
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center space-x-2 font-mono">
                <span>Connect Remote Server</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)] font-mono font-bold">
                  {connectionMode === 'http' ? 'HTTP / Shiro Backend' : 'SSH Shell'}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {connectionMode === 'http' 
                  ? 'Connect RenKairo UI directly to remote Shiro backend APIs & workspaces'
                  : 'Launch an interactive SSH terminal in the bottom panel'}
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

        {/* Protocol Selector Tabs (HTTP Method vs SSH Terminal) */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-base)] px-4 pt-2">
          <button
            type="button"
            onClick={() => setConnectionMode('http')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              connectionMode === 'http'
                ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-[var(--bg-panel)] rounded-t'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>HTTP Backend (Port 8080)</span>
          </button>
          <button
            type="button"
            onClick={() => setConnectionMode('ssh')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              connectionMode === 'ssh'
                ? 'border-[var(--accent-coral)] text-[var(--accent-coral)] bg-[var(--bg-panel)] rounded-t'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SSH Shell (Port 22)</span>
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* TAB 1: HTTP BACKEND CONNECTION (OPTION 2: DIRECT HTTP REST API)  */}
        {/* ---------------------------------------------------------------- */}
        {connectionMode === 'http' && (
          <form onSubmit={handleConnectHttp} className="p-4 space-y-4 text-xs font-sans">
            {/* Account Authentication Status Banner */}
            {isAuthenticated && authUser ? (
              authToken === 'renkairo-mock-jwt-token-local-dev-mode' ? (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[var(--text-primary)] font-semibold">{authUser.username}</span>
                      <span className="text-amber-400 text-[10px] ml-1.5">(Local Mock Account)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    disabled={isDemoLoggingIn}
                    className="px-2.5 py-1 rounded bg-[var(--accent-coral)] text-white text-[10px] font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1"
                  >
                    {isDemoLoggingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                    <span>Sign in as Developer</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[var(--text-primary)] font-semibold">{authUser.username}</span>
                      <span className="text-[var(--text-muted)] text-[10px] ml-1.5">({authUser.role || 'DEVELOPER'})</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold shrink-0">
                    <KeyRound className="w-3 h-3" />
                    <span>Authenticated JWT</span>
                  </div>
                </div>
              )
            ) : (
              <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                  <KeyRound className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
                  <span className="text-[11px]">Unauthenticated Session</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={isDemoLoggingIn}
                  className="px-2.5 py-1 rounded bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] text-[10px] font-mono font-semibold hover:bg-[var(--accent-cyan)]/30 transition-colors flex items-center space-x-1"
                >
                  {isDemoLoggingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                  <span>Quick Demo Sign In</span>
                </button>
              </div>
            )}

            {/* Target Server Host & Port Grid */}
            <div className="grid grid-cols-4 gap-3">
              {/* Protocol */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Protocol
                </label>
                <select
                  value={httpProtocol}
                  onChange={(e) => setHttpProtocol(e.target.value as 'http' | 'https')}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="http">http://</option>
                  <option value="https">https://</option>
                </select>
              </div>

              {/* Host / IP */}
              <div className="col-span-2 space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Remote Host / IP <span className="text-[var(--accent-coral)]">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={httpHost}
                    onChange={(e) => handleHttpHostChange(e.target.value)}
                    placeholder="e.g. 192.168.1.120 or hostname.duckdns.org"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none shadow-sm pr-8 transition-colors"
                  />
                  <Globe className="w-4 h-4 text-[var(--accent-cyan)] absolute right-2.5 top-2.5 pointer-events-none opacity-80" />
                </div>
              </div>

              {/* Port */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Port
                </label>
                <input
                  type="text"
                  value={httpPort}
                  onChange={(e) => setHttpPort(e.target.value)}
                  placeholder="8080"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm transition-colors text-center font-bold"
                />
              </div>
            </div>

            {/* Live HTTP Endpoint & Auth Header Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono uppercase font-semibold">
                <span>Active HTTP Endpoint Target</span>
                <span className="text-[var(--accent-cyan)]">REST / JSON</span>
              </div>
              <div className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg font-mono text-[11px] text-[var(--accent-cyan)] shadow-inner break-all space-y-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-emerald-400 font-bold">API:</span>
                  <span className="text-[var(--text-primary)] font-semibold">{constructedHttpUrl}</span>
                </div>
                {isAuthenticated && authToken && (
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    <span className="text-amber-400 font-semibold">Header: </span>
                    <span>Authorization: Bearer {authToken.substring(0, 18)}...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Select Recent Backend URLs */}
            {recentHttpHosts.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] font-mono uppercase font-semibold">
                  <Clock className="w-3 h-3 text-[var(--text-subtle)]" />
                  <span>Recent Backend Servers</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentHttpHosts.map((recent) => (
                    <button
                      key={recent}
                      type="button"
                      onClick={() => handleHttpHostChange(recent)}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-all flex items-center space-x-1 cursor-pointer ${
                        constructedHttpUrl === recent
                          ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-semibold'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Globe className="w-3 h-3 text-[var(--text-subtle)]" />
                      <span>{recent}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test Connection Result Alert */}
            {httpTestResult && (
              <div className={`p-3 rounded-lg border text-xs font-mono flex flex-col space-y-2 animate-in fade-in duration-150 ${
                httpTestResult.serverReachable
                  ? httpTestResult.tokenValid 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              }`}>
                <div className="flex items-start space-x-2">
                  {httpTestResult.serverReachable ? (
                    httpTestResult.tokenValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <p className="font-semibold">
                      {httpTestResult.serverReachable
                        ? (httpTestResult.tokenValid ? 'Connection Verified & Authenticated!' : 'Server Online (8080) — Authentication Needed')
                        : 'Connection Failed'}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {httpTestResult.serverReachable
                        ? httpTestResult.message || `Shiro Backend reached at ${httpTestResult.serverUrl} (${httpTestResult.latencyMs}ms latency).`
                        : httpTestResult.error}
                    </p>
                  </div>
                </div>

                {/* If server is reachable but token is not authenticated, show direct action buttons */}
                {httpTestResult.serverReachable && !httpTestResult.tokenValid && (
                  <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBackendBaseUrl(constructedHttpUrl);
                        setConnectServerModalOpen(false);
                        setAuthModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded text-[11px] border border-amber-500/40 text-amber-200 hover:bg-amber-500/20 transition-colors"
                    >
                      Sign In / Register
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickDemoLogin}
                      disabled={isDemoLoggingIn}
                      className="px-2.5 py-1 rounded bg-[var(--accent-coral)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1 shadow-sm"
                    >
                      {isDemoLoggingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                      <span>Quick Sign In (developer)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Demo Login Error Banner */}
            {demoLoginError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{demoLoginError}</span>
              </div>
            )}

            {/* Helpful Explanation Pill */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[var(--text-secondary)] font-medium">Direct HTTP / REST Architecture</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Sends HTTP web requests and JWT headers directly to port 8080 on the remote server. No SSH tunnel or command-line forwarding is required.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={isDemoLoggingIn || !cleanHttpHost}
                title="Quickly authenticate using the remote server's seeded developer account"
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-cyan)] text-[var(--accent-cyan)] transition-colors font-mono text-[11px] flex items-center space-x-1.5 hover:bg-[var(--bg-card)] cursor-pointer disabled:opacity-50"
              >
                {isDemoLoggingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                <span>Demo Sign In (developer@renkairo.io)</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setConnectServerModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cleanHttpHost || httpTesting}
                  className={`px-4 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-semibold shadow-md transition-all font-mono ${
                    cleanHttpHost && !httpTesting
                      ? 'bg-gradient-to-r from-[var(--accent-coral)] to-[var(--accent-cyan)] text-white hover:opacity-95 active:scale-98 cursor-pointer' 
                      : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-subtle)] cursor-not-allowed'
                  }`}
                >
                  {httpTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing & Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5" />
                      <span>Save & Connect (Port 8080)</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 2: SSH TERMINAL SHELL (PORT 22)                              */}
        {/* ---------------------------------------------------------------- */}
        {connectionMode === 'ssh' && (
          <form onSubmit={handleConnectSsh} className="p-4 space-y-4 text-xs font-sans">
            {/* Account Status */}
            {isAuthenticated && authUser ? (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[var(--text-primary)] font-semibold">{authUser.username}</span>
                    <span className="text-[var(--text-muted)] text-[10px] ml-1.5">({authUser.role || 'DEVELOPER'})</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold shrink-0">
                  <KeyRound className="w-3 h-3" />
                  <span>Shiro JWT Active</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start justify-between space-x-3">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-500">Sign In Required</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      You must be signed in to a RenKairo account to establish SSH connections. Anonymous connections are restricted.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConnectServerModalOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/90 text-white font-semibold text-xs flex items-center space-x-1.5 shrink-0 shadow-sm transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            )}

            {/* Target Host Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                SSH Server IP / Hostname <span className="text-[var(--accent-coral)]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sshHost}
                  onChange={(e) => setSshHost(e.target.value)}
                  placeholder="e.g. 192.168.1.120 or hostname.local (Port 22)"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none shadow-sm pr-9 transition-colors"
                />
                <Wifi className="w-4 h-4 text-[var(--accent-cyan)] absolute right-3 top-2.5 pointer-events-none opacity-80" />
              </div>
            </div>

            {/* User & Port Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Linux SSH User
                </label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  placeholder="Azhar"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  SSH Port
                </label>
                <input
                  type="text"
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                  placeholder="22"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm transition-colors text-center font-bold"
                />
              </div>
            </div>

            {/* Password Credentials */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Workspace Scope Name
                </label>
                <input
                  type="text"
                  value={sshWorkspaceName}
                  onChange={(e) => setSshWorkspaceName(e.target.value)}
                  placeholder="default"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--accent-cyan)] focus:outline-none shadow-sm transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Server Password (Optional)
                </label>
                <input
                  type="password"
                  value={sshPassword}
                  onChange={(e) => setSshPassword(e.target.value)}
                  placeholder="Auto-inject password"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent-cyan)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none shadow-sm transition-colors"
                />
              </div>
            </div>

            {/* Command Preview */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono uppercase font-semibold">
                <span className="flex items-center space-x-1">
                  <Terminal className="w-3 h-3 text-[var(--accent-coral)]" />
                  <span>Executed CLI Command</span>
                </span>
                {targetSshHost && (
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="hover:text-[var(--accent-cyan)] flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg font-mono text-[11px] text-[var(--accent-cyan)] shadow-inner truncate">
                <span className="text-[var(--text-subtle)] mr-2 select-none">$</span>
                <span className="font-semibold text-emerald-400">ssh </span>
                {targetSshPort !== '22' && (
                  <span className="text-amber-400">-p {targetSshPort} </span>
                )}
                <span className="text-[var(--accent-coral)] font-bold">{targetSshUser}</span>
                <span className="text-[var(--text-subtle)]">@</span>
                <span className="text-[var(--accent-cyan)] font-semibold">
                  {targetSshHost || <span className="text-[var(--text-subtle)]">[ipaddress]</span>}
                </span>
              </div>
            </div>

          {/* Provisioning Error Banner */}
          {provisionError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-[11px] text-rose-400 font-mono flex items-start space-x-2">
              <span className="shrink-0 text-rose-400 font-bold">⚠️</span>
              <div className="flex-1 break-words">{provisionError}</div>
            </div>
          )}

          {/* Helpful Information Pill */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[var(--text-secondary)] font-medium">HTTP Workspace Isolation & Provisioning</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                The backend provisions <code className="text-[var(--accent-cyan)] font-mono">~/.renkairo/workspaces/{sshWorkspaceName || 'default'}</code> over HTTP before opening the interactive SSH terminal.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              disabled={isProvisioning}
              onClick={() => setConnectServerModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetSshHost || isProvisioning}
              className={`px-4 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-semibold shadow-md transition-all font-mono ${
                targetSshHost && !isProvisioning
                  ? 'bg-gradient-to-r from-[var(--accent-coral)] to-[var(--accent-cyan)] text-white hover:opacity-95 active:scale-98 cursor-pointer' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-subtle)] cursor-not-allowed'
              }`}
            >
              {isProvisioning ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  <span>Provisioning Workspace...</span>
                </>
              ) : (
                <>
                  <Server className="w-3.5 h-3.5" />
                  <span>Connect & Open Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      </div>
    </div>
  );
};
