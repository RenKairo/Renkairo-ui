import React from 'react';
import { 
  FolderTree, 
  Search, 
  GitBranch, 
  HardDrive, 
  Box, 
  Cpu, 
  Users, 
  Settings
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useGitStore } from '../../store/gitStore';
import { ActivityView } from '../../types/ide';
import { ToriiIcon } from '../common/ToriiIcon';

export const ActivityBar: React.FC = () => {
  const { theme, activeActivity, setActiveActivity } = useIDEStore();
  const { gitStatus } = useGitStore();
  const gitChangesCount = gitStatus?.totalChanges || 0;

  const navItems: { id: ActivityView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'explorer', label: 'Explorer', icon: FolderTree },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'git', label: 'Source Control', icon: GitBranch },
    { id: 'remote', label: 'Remote', icon: HardDrive },
    { id: 'docker', label: 'Docker', icon: Box },
    { id: 'resources', label: 'Resources', icon: Cpu },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-14 bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col justify-between items-center py-2 select-none z-20 transition-colors duration-150">
      {/* Top Nav Action Group */}
      <div className="w-full flex flex-col items-center space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeActivity === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveActivity(isActive ? null : item.id)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-[var(--bg-card)] text-[var(--accent-coral)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--accent-coral)] rounded-r cyber-glow-coral" />
              )}
              {item.id === 'git' && gitChangesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--accent-coral)] text-white text-[9px] font-mono font-bold flex items-center justify-center border border-[var(--bg-panel)] shadow-sm">
                  {gitChangesCount > 99 ? '99+' : gitChangesCount}
                </span>
              )}
              {item.id === 'remote' && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 border border-[var(--bg-panel)]"></span>
              )}
              {item.id === 'team' && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-400 border border-[var(--bg-panel)]"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Panel Artwork Banner */}
      <div className="w-full flex flex-col items-center px-1 pb-1">

        {/* Decorative Torii Japanese Wallpaper Thumbnail */}
        <div 
          className="w-11 h-14 rounded border border-[var(--border-color)] bg-[var(--bg-card)] bg-cover bg-center relative overflow-hidden flex flex-col justify-end p-1 group shadow-sm"
          style={{ backgroundImage: theme === 'light' ? "url('/wallpaper-light.jpeg')" : "url('/wallpaper-dark.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-panel)] via-[var(--bg-panel)]/40 to-transparent"></div>
          {/* Subtle Torii Graphic */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 opacity-70 group-hover:opacity-100 transition-opacity">
            <ToriiIcon color="var(--accent-coral)" className="w-3.5 h-3.5 drop-shadow-[0_0_6px_var(--glow-coral)]" />
          </div>
          <span className="text-[7px] font-mono text-center text-[var(--text-muted)] z-10 tracking-widest font-semibold uppercase">
            RENKAIRO
          </span>
          <span className="text-[6px] font-mono text-center text-[var(--accent-coral)] z-10 font-bold opacity-90">
            v1.0.0
          </span>
        </div>
      </div>
    </nav>
  );
};
