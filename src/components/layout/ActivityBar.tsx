import React from 'react';
import { 
  FolderTree, 
  Search, 
  GitBranch, 
  HardDrive, 
  Box, 
  Cpu, 
  FileText, 
  Users, 
  Settings,
  ChevronLeft
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ActivityView } from '../../types/ide';
import { ToriiIcon } from '../common/ToriiIcon';

export const ActivityBar: React.FC = () => {
  const { activeActivity, setActiveActivity } = useIDEStore();

  const navItems: { id: ActivityView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'explorer', label: 'Explorer', icon: FolderTree },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'git', label: 'Source Control', icon: GitBranch },
    { id: 'remote', label: 'Remote', icon: HardDrive },
    { id: 'docker', label: 'Docker', icon: Box },
    { id: 'resources', label: 'Resources', icon: Cpu },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-14 bg-[#0B0D11] border-r border-[#232734] flex flex-col justify-between items-center py-2 select-none z-20">
      {/* Top Nav Action Group */}
      <div className="w-full flex flex-col items-center space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeActivity === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveActivity(item.id)}
              title={item.label}
              className={`w-full py-2.5 flex flex-col items-center justify-center relative group transition-all focus:outline-none ${
                isActive ? 'text-[#FF4D4D]' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {/* Active Left Coral Accent Bar */}
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#FF4D4D] rounded-r cyber-glow-coral"></div>
              )}
              
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,77,77,0.5)]' : ''}`} />
              <span className="text-[9px] mt-1 font-medium tracking-tight opacity-80 group-hover:opacity-100">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Panel Artwork Banner */}
      <div className="w-full flex flex-col items-center px-1 pb-1">
        <button title="Collapse Sidebars" className="p-1 text-gray-500 hover:text-white transition-colors mb-2">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Decorative Torii Japanese Wallpaper Thumbnail */}
        <div 
          className="w-11 h-14 rounded border border-[#232734] bg-[#12151C] bg-cover bg-center relative overflow-hidden flex flex-col justify-end p-1 group"
          style={{ backgroundImage: `url('/wallpaper.png')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D11] via-[#12151C]/40 to-transparent"></div>
          {/* Subtle Torii Graphic */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 opacity-70 group-hover:opacity-100 transition-opacity">
            <ToriiIcon className="w-3.5 h-3.5 drop-shadow-[0_0_6px_rgba(255,77,77,0.7)]" />
          </div>
          <span className="text-[7px] font-mono text-center text-gray-400 z-10 tracking-widest font-semibold uppercase">
            RENKAIRO
          </span>
          <span className="text-[6px] font-mono text-center text-[#FF4D4D] z-10 opacity-80">
            v1.0.0
          </span>
        </div>
      </div>
    </nav>
  );
};
