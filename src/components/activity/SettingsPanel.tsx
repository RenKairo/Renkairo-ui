import React from 'react';
import { Settings, Sliders, Eye, Type, Image, Check, Moon, Sun } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';

export const SettingsPanel: React.FC = () => {
  const { 
    theme,
    setTheme,
    fontSize, 
    setFontSize, 
    tabSize, 
    setTabSize, 
    minimapEnabled, 
    setMinimapEnabled,
    formatOnSave,
    setFormatOnSave,
    wallpaperOpacity,
    setWallpaperOpacity,
    terminalCopyOnSelect,
    setTerminalCopyOnSelect,
    terminalCompactPath,
    setTerminalCompactPath
  } = useIDEStore();

  return (
    <aside className="w-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col select-none h-full z-10 font-sans transition-colors duration-150">
      <div className="h-9 px-3 border-b border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
        <span>IDE PREFERENCES</span>
      </div>

      <div className="p-3 space-y-4 font-mono text-xs overflow-y-auto">
        {/* Theme Variant Selection */}
        <div className="space-y-1.5">
          <span className="font-semibold text-[var(--text-primary)] block">Appearance & Theme</span>
          <div className="grid grid-cols-1 gap-2">
            {/* Dark Theme Card */}
            <div 
              onClick={() => setTheme('dark')}
              className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                theme === 'dark' 
                  ? 'bg-[#12151C] border-[var(--accent-coral)] text-white shadow-[0_0_12px_var(--glow-coral)]' 
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-[#0B0D11] border border-[#232734] flex items-center justify-center text-amber-400">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">East-Asian Cyber Dark</div>
                  <div className="text-[10px] text-gray-400">Obsidian & Torii Coral Crimson</div>
                </div>
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-[var(--accent-coral)]" />}
            </div>

            {/* Light Theme Card */}
            <div 
              onClick={() => setTheme('light')}
              className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                theme === 'light' 
                  ? 'bg-[#FFFFFF] border-[var(--accent-coral)] text-[#0F172A] shadow-[0_0_12px_var(--glow-coral)]' 
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)]/40'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center text-amber-500">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">Kyoto Porcelain Light</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Clean Canvas & Sapphire Indigo</div>
                </div>
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-[var(--accent-coral)]" />}
            </div>
          </div>
        </div>

        {/* Editor Font Size Setting */}
        <div className="space-y-1.5 border-t border-[var(--border-color)] pt-3">
          <div className="flex justify-between text-[var(--text-primary)]">
            <span className="font-semibold">Font Size</span>
            <span className="text-[var(--text-muted)]">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-[var(--accent-coral)] cursor-pointer"
          />
        </div>

        {/* Tab Indentation Spacing */}
        <div className="space-y-1.5">
          <span className="font-semibold text-[var(--text-primary)] block">Tab Spacing</span>
          <div className="flex space-x-2">
            {[2, 4].map((size) => (
              <button
                key={size}
                onClick={() => setTabSize(size)}
                className={`flex-1 py-1 rounded text-xs border transition-colors ${
                  tabSize === size 
                    ? 'bg-[var(--accent-coral)]/15 text-[var(--accent-coral)] border-[var(--accent-coral)] font-bold' 
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                }`}
              >
                {size} Spaces
              </button>
            ))}
          </div>
        </div>

        {/* Wallpaper Opacity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[var(--text-primary)]">
            <span className="font-semibold">Wallpaper Opacity</span>
            <span className="text-[var(--text-muted)]">{wallpaperOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={wallpaperOpacity}
            onChange={(e) => setWallpaperOpacity(Number(e.target.value))}
            className="w-full accent-[var(--accent-cyan)] cursor-pointer"
          />
        </div>

        {/* Minimap Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-[var(--border-color)]">
          <span className="font-semibold text-[var(--text-primary)]">Code Minimap</span>
          <button
            onClick={() => setMinimapEnabled(!minimapEnabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              minimapEnabled ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              minimapEnabled ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Format on Save Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-[var(--border-color)]">
          <span className="font-semibold text-[var(--text-primary)]">Format on Save</span>
          <button
            onClick={() => setFormatOnSave(!formatOnSave)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              formatOnSave ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              formatOnSave ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Terminal Preferences */}
        <div className="space-y-2.5 border-t border-[var(--border-color)] pt-3">
          <span className="font-semibold text-[var(--text-muted)] block uppercase tracking-wider text-[10px]">
            TERMINAL SETTINGS
          </span>

          {/* Terminal Copy on Select Toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col pr-2">
              <span className="font-semibold text-[var(--text-primary)]">Copy on Select</span>
              <span className="text-[10px] text-[var(--text-muted)]">Auto-copy highlighted text</span>
            </div>
            <button
              onClick={() => setTerminalCopyOnSelect(!terminalCopyOnSelect)}
              title={terminalCopyOnSelect ? 'Disable Copy on Selection' : 'Enable Copy on Selection'}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                terminalCopyOnSelect ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                terminalCopyOnSelect ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Terminal Compact Path (Root Only) Toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col pr-2">
              <span className="font-semibold text-[var(--text-primary)]">Root-Only Path</span>
              <span className="text-[10px] text-[var(--text-muted)]">Short path (Linux/macOS style)</span>
            </div>
            <button
              onClick={() => setTerminalCompactPath(!terminalCompactPath)}
              title={terminalCompactPath ? 'Show Full Working Path' : 'Show Root Only (Linux/macOS style)'}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                terminalCompactPath ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                terminalCompactPath ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* About RenKairo Brand Card */}
        <div className="border-t border-[var(--border-color)] pt-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 flex items-center space-x-3 group shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-color)] flex items-center justify-center shrink-0 p-1.5 shadow-sm">
              <ToriiIcon color="var(--accent-coral)" className="w-6 h-6 drop-shadow-[0_0_8px_var(--glow-coral)] group-hover:scale-110 transition-transform" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-[var(--text-primary)] text-xs tracking-wide font-mono">RenKairo IDE</div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">v1.0.0 • Cloud & AI Engineering Canvas</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
