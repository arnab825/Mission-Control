import React, { useState, useRef } from 'react';

export const HotkeyRecorder: React.FC<{
  value: string;
  onChange: (newValue: string) => void;
}> = ({ value, onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  const formatDisplay = (val: string) => {
    return val.replace(/</g, '').replace(/>/g, '').toUpperCase();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (!isRecording) return;

    const key = e.key.toLowerCase();
    if (key === 'escape') {
      setIsRecording(false);
      setCurrentKeys([]);
      return;
    }

    if (key === 'backspace') {
      setCurrentKeys([]);
      return;
    }

    // Capture modifiers and the main key
    const keys: string[] = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.altKey) keys.push('alt');
    if (e.shiftKey) keys.push('shift');
    if (e.metaKey) keys.push('win');

    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      keys.push(key);
    }

    const uniqueKeys = Array.from(new Set(keys));
    setCurrentKeys(uniqueKeys);

    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      // It's a full combo
      const formatted = uniqueKeys.map(k => (['ctrl', 'alt', 'shift', 'win'].includes(k) ? `<${k}>` : k)).join('+');
      onChange(formatted);
      setIsRecording(false);
    }
  };

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => setIsRecording(true)}
      onBlur={() => setIsRecording(false)}
      className={`w-full bg-black/40 border rounded-xl py-2.5 px-4 text-xs font-black text-center uppercase cursor-pointer transition-all outline-none ${
        isRecording
          ? 'border-neon-green bg-neon-green/5 shadow-[0_0_15px_rgba(118,185,0,0.2)]'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <span className={isRecording ? 'text-neon-green' : 'text-zinc-400'}>
        {isRecording
          ? (currentKeys.length > 0 ? currentKeys.join(' + ').toUpperCase() : 'Press keys...')
          : (value ? formatDisplay(value) : 'None')}
      </span>
    </div>
  );
};
