import { useEffect, useRef } from 'react';

/**
 * Custom React hook to bind keyboard shortcut hotkeys
 * @param keyCombo Keyboard combination (e.g. 'ctrl+shift+g', 'alt+z')
 * @param callback Callback function when combination is pressed
 */
export const useHotkey = (keyCombo: string, callback: () => void) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = keyCombo.toLowerCase().split('+');
      const needsCtrl = keys.includes('ctrl') || keys.includes('control');
      const needsShift = keys.includes('shift');
      const needsAlt = keys.includes('alt');
      const targetKey = keys[keys.length - 1];

      // Match modifiers
      const matchesCtrl = e.ctrlKey === needsCtrl;
      const matchesShift = e.shiftKey === needsShift;
      const matchesAlt = e.altKey === needsAlt;
      const matchesKey = e.key.toLowerCase() === targetKey;

      if (matchesCtrl && matchesShift && matchesAlt && matchesKey) {
        e.preventDefault();
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyCombo]);
};
