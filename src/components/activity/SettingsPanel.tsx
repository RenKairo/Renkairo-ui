import React from 'react';
import { Settings, Sliders, Eye, Type, Image, Check } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { ToriiIcon } from '../common/ToriiIcon';

export const SettingsPanel: React.FC = () => {
  const { 
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
    <aside className="w-full bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
      <div className="h-9 px-3 border-b border-[#232734] flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <span>IDE PREFERENCES</span>
      </div>

      <div className="p-3 space-y-4 font-mono text-xs overflow-y-auto">
        {/* Editor Font Size Setting */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-gray-300">
            <span className="font-semibold">Font Size</span>
            <span className="text-gray-400">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-[#FF4D4D] cursor-pointer"
          />
        </div>

        {/* Tab Indentation Spacing */}
        <div className="space-y-1.5">
          <span className="font-semibold text-gray-300 block">Tab Spacing</span>
          <div className="flex space-x-2">
            {[2, 4].map((size) => (
              <button
                key={size}
                onClick={() => setTabSize(size)}
                className={`flex-1 py-1 rounded text-xs border transition-colors ${
                  tabSize === size ? 'bg-[#FF4D4D]/20 text-[#FF4D4D] border-[#FF4D4D]' : 'bg-[#12151C] text-gray-400 border-[#232734]'
                }`}
              >
                {size} Spaces
              </button>
            ))}
          </div>
        </div>

        {/* Wallpaper Opacity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-gray-300">
            <span className="font-semibold">Wallpaper Opacity</span>
            <span className="text-gray-400">{wallpaperOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={wallpaperOpacity}
            onChange={(e) => setWallpaperOpacity(Number(e.target.value))}
            className="w-full accent-[#38BDF8] cursor-pointer"
          />
        </div>

        {/* Minimap Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-[#232734]">
          <span className="font-semibold text-gray-300">Code Minimap</span>
          <button
            onClick={() => setMinimapEnabled(!minimapEnabled)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              minimapEnabled ? 'bg-emerald-500' : 'bg-[#232734]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              minimapEnabled ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Format on Save Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-[#232734]">
          <span className="font-semibold text-gray-300">Format on Save</span>
          <button
            onClick={() => setFormatOnSave(!formatOnSave)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              formatOnSave ? 'bg-emerald-500' : 'bg-[#232734]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              formatOnSave ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Terminal Preferences */}
        <div className="space-y-2.5 border-t border-[#232734] pt-3">
          <span className="font-semibold text-gray-400 block uppercase tracking-wider text-[10px]">
            TERMINAL SETTINGS
          </span>

          {/* Terminal Copy on Select Toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col pr-2">
              <span className="font-semibold text-gray-300">Copy on Select</span>
              <span className="text-[10px] text-gray-500">Auto-copy highlighted text</span>
            </div>
            <button
              onClick={() => setTerminalCopyOnSelect(!terminalCopyOnSelect)}
              title={terminalCopyOnSelect ? 'Disable Copy on Selection' : 'Enable Copy on Selection'}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                terminalCopyOnSelect ? 'bg-emerald-500' : 'bg-[#232734]'
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
              <span className="font-semibold text-gray-300">Root-Only Path</span>
              <span className="text-[10px] text-gray-500">Short path (Linux/macOS style)</span>
            </div>
            <button
              onClick={() => setTerminalCompactPath(!terminalCompactPath)}
              title={terminalCompactPath ? 'Show Full Working Path' : 'Show Root Only (Linux/macOS style)'}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                terminalCompactPath ? 'bg-emerald-500' : 'bg-[#232734]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                terminalCompactPath ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Theme Variant Selection */}
        <div className="space-y-1.5 border-t border-[#232734] pt-3">
          <span className="font-semibold text-gray-300 block">Theme Variant</span>
          <div className="space-y-1.5">
            <div className="p-2 rounded bg-[#12151C] border border-[#FF4D4D] text-white flex items-center justify-between cursor-pointer">
              <span>East-Asian Dark Cyber</span>
              <Check className="w-3.5 h-3.5 text-[#FF4D4D]" />
            </div>
            <div className="p-2 rounded bg-[#0B0D11] border border-[#232734] text-gray-400 flex items-center justify-between cursor-pointer hover:text-white">
              <span>Midnight Pure Black</span>
            </div>
          </div>
        </div>

        {/* About RenKairo Brand Card */}
        <div className="border-t border-[#232734] pt-3">
          <div className="bg-[#12151C] border border-[#232734] rounded-lg p-3 flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#0B0D11] border border-[#232734] flex items-center justify-center shrink-0 p-1.5 shadow-inner">
              <ToriiIcon className="w-6 h-6 drop-shadow-[0_0_8px_rgba(255,77,77,0.6)] group-hover:scale-110 transition-transform" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-white text-xs tracking-wide font-mono">RenKairo IDE</div>
              <div className="text-[10px] text-gray-400 font-mono">v1.0.0 • Cloud & AI Engineering Canvas</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
