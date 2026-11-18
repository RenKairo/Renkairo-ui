import React from 'react';
import { 
  FolderTree, 
  Search, 
  GitBranch, 
  Users, 
  Settings,
  Zap
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { useGitStore } from '../../store/gitStore';
import { ActivityView } from '../../types/ide';

export const ActivityBar: React.FC = () => {
  const { activeActivity, setActiveActivity } = useIDEStore();
  const { gitStatus } = useGitStore();
  const gitChangesCount = gitStatus?.totalChanges || 0;

  const topNavItems: { id: ActivityView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'explorer', label: 'Explorer', icon: FolderTree },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'git', label: 'Source Control', icon: GitBranch },
    { id: 'rdtp', label: 'RDTP ML Studio', icon: Zap },
    { id: 'team', label: 'Team', icon: Users },
  ];

  const bottomNavItems: { id: ActivityView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderNavButton = (item: { id: ActivityView; label: string; icon: React.FC<{ className?: string }> }) => {
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
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--accent-coral)] rounded-r" />
        )}
        {item.id === 'git' && gitChangesCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--accent-coral)] text-white text-[9px] font-mono font-bold flex items-center justify-center border border-[var(--bg-panel)] shadow-sm">
            {gitChangesCount > 99 ? '99+' : gitChangesCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="w-14 bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col justify-between items-center py-2 select-none z-20 transition-colors duration-150">
      {/* Top Nav Action Group */}
      <div className="w-full flex flex-col items-center space-y-1">
        {topNavItems.map(renderNavButton)}
      </div>

      {/* Bottom Nav Action Group */}
      <div className="w-full flex flex-col items-center space-y-1">
        {bottomNavItems.map(renderNavButton)}
      </div>
    </nav>
  );
};
