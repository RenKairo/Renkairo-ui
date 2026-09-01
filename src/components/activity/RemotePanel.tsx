import React, { useState } from 'react';
import { HardDrive, Server, Plus, Power, Wifi, ShieldCheck, Terminal } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const RemotePanel: React.FC = () => {
  const { setActiveTerminalTab } = useIDEStore();
  const [connections, setConnections] = useState([
    { id: '1', name: 'gpu-cluster-01', host: '192.168.1.120', ping: '12ms', status: 'connected', region: 'us-east-1' },
    { id: '2', name: 'prod-api-server', host: 'api.renkairo.io', ping: '45ms', status: 'disconnected', region: 'eu-central-1' },
    { id: '3', name: 'staging-k8s-node', host: '10.0.4.15', ping: '8ms', status: 'connected', region: 'us-west-2' },
  ]);

  const toggleConnect = (id: string) => {
    setConnections(connections.map(c => 
      c.id === id ? { ...c, status: c.status === 'connected' ? 'disconnected' : 'connected' } : c
    ));
  };

  const addConnection = () => {
    const name = prompt('Enter Remote Host Name (e.g. dev-server):');
    if (!name) return;
    const host = prompt('Enter IP or Domain (e.g. 192.168.1.50):') || '127.0.0.1';
    setConnections([
      ...connections,
      { id: Date.now().toString(), name, host, ping: '18ms', status: 'connected', region: 'us-east-1' }
    ]);
  };

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
      <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider bg-[var(--bg-panel)]">
        <span>REMOTE SSH & COMPUTE</span>
        <button onClick={addConnection} title="Add SSH Host" className="p-1 hover:text-[var(--text-primary)] transition-colors">
          <Plus className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-1.5 text-xs shadow-sm">
          <div className="flex items-center space-x-2 text-[var(--accent-cyan)] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>SSH Key Auth Active</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Connected securely using id_ed25519.</p>
        </div>

        <div className="text-[10px] font-mono text-[var(--text-muted)] font-semibold uppercase px-1">
          CONFIGURED HOSTS ({connections.length})
        </div>

        <div className="space-y-2">
          {connections.map((c) => (
            <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 space-y-2 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] font-mono">{c.name}</h4>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">{c.host}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  c.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-color)]'
                }`}>
                  {c.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)] text-[10px] font-mono">
                <div className="flex items-center space-x-1 text-[var(--text-muted)]">
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span>{c.ping}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => { setActiveTerminalTab('TERMINAL'); }} 
                    title="Open SSH Terminal"
                    className="p-1 hover:text-[var(--text-primary)] text-[var(--text-muted)]"
                  >
                    <Terminal className="w-3 h-3 text-[var(--accent-cyan)]" />
                  </button>
                  <button 
                    onClick={() => toggleConnect(c.id)} 
                    title={c.status === 'connected' ? 'Disconnect' : 'Connect'}
                    className={`p-1 ${c.status === 'connected' ? 'text-rose-500 hover:text-rose-600' : 'text-emerald-500 hover:text-emerald-600'}`}
                  >
                    <Power className="w-3 h-3" />
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
