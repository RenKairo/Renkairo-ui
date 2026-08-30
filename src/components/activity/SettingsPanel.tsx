import React from 'react';
import { Settings, Sliders, Eye, Type, Image, Check } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

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
    setWallpaperOpacity
  } = useIDEStore();

  return (
    <aside className="w-64 bg-[#0B0D11] border-r border-[#232734] flex flex-col select-none h-full z-10 font-sans">
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

        {/* Theme Theme Selection */}
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
      </div>
    </aside>
  );
};
