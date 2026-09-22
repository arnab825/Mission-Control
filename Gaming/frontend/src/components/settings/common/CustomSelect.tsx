import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OptionItem } from '../../../data/settingsConstants';

export const CustomSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: OptionItem[];
  className?: string;
  isMono?: boolean;
  size?: 'sm' | 'md';
}> = ({ value, onChange, options, className = '', isMono = false, size = 'md' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.label === value);
  const displayLabel = selectedOption ? selectedOption.label : (options[0]?.label || value);

  const renderedItems: React.ReactNode[] = [];
  let currentGroup = '';

  options.forEach((opt, idx) => {
    if (opt.group && opt.group !== currentGroup) {
      currentGroup = opt.group;
      renderedItems.push(
        <div key={`group-${currentGroup}`} className="px-3 py-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 border-b border-white/10 mt-2 first:mt-0 font-sans">
          {currentGroup}
        </div>
      );
    }

    const isSelected = opt.value === value || opt.label === value;

    renderedItems.push(
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
        key={`opt-${idx}-${opt.value}`}
        onClick={() => {
          onChange(opt.value);
          setIsOpen(false);
        }}
        className={`px-4 py-2.5 text-xs cursor-pointer transition-all flex items-center justify-between ${
          isSelected
            ? 'bg-neon-green/10 text-neon-green font-bold font-sans'
            : 'text-zinc-300 hover:bg-white/4 hover:text-white font-sans'
        } ${opt.isMono || isMono ? 'font-mono' : ''}`}
      >
        <span>{opt.label}</span>
        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(118,185,0,0.8)]" />}
      </div>
    );
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0c0c12]/80 border rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${
          size === 'sm' ? 'py-1.5 px-3 text-[10px]' : 'py-2.5 px-4 text-xs font-bold'
        } ${
          isOpen
            ? 'border-neon-green/50 bg-[#0c0c12] shadow-[0_0_15px_rgba(118,185,0,0.15)]'
            : 'border-white/10 hover:border-white/20'
        } ${isMono || selectedOption?.isMono ? 'font-mono text-neon-green' : 'text-zinc-300'} ${className}`}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown
          className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-neon-green' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-[#0d0d14]/95 border border-white/10 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl z-50 custom-scrollbar py-1">
          {renderedItems}
        </div>
      )}
    </div>
  );
};
