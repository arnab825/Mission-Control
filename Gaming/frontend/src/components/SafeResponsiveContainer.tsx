import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer } from 'recharts';

export const SafeResponsiveContainer: React.FC<React.ComponentProps<typeof ResponsiveContainer>> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Measure initial size immediately
    const rect = el.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasValidSize = dimensions.width > 0 && dimensions.height > 0;

  return (
    <div ref={containerRef} className="w-full h-full min-w-0 min-h-0 relative">
      {hasValidSize && (
        <ResponsiveContainer {...props} width={dimensions.width} height={dimensions.height} minWidth={1} minHeight={1} />
      )}
    </div>
  );
};

export default SafeResponsiveContainer;
