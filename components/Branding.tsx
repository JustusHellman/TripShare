
import React, { useState, useEffect, useMemo } from 'react';

export const FlyingWordsBackground: React.FC = () => {
  // Use useMemo to ensure properties are stable and don't recalculate on every tick
  // This prevents the "stuttering" effect caused by React reconciliation on mount
  const words = useMemo(() => {
    const palette = ['#2d4239', '#8c6b4f', '#b4c4bc', '#4a5d55'];
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      text: i % 2 === 0 ? 'HERE' : 'THERE',
      top: `${(i * 7) % 100}%`,
      duration: `${50 + (i * 3) % 40}s`,
      delay: `${-(i * 5) % 60}s`,
      size: `${1 + (i % 3)}rem`,
      color: palette[i % palette.length],
      opacity: 0.02 + (i % 5) * 0.005,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {words.map(w => (
        <div 
          key={w.id}
          className="flying-word fixed z-0 pointer-events-none whitespace-nowrap uppercase font-medium select-none"
          style={{
            top: w.top,
            fontSize: w.size,
            color: w.color,
            opacity: w.opacity,
            animation: `subtle-drift ${w.duration} linear infinite`,
            animationDelay: w.delay
          }}
        >
          {w.text}
        </div>
      ))}
    </div>
  );
};

export const SwapTLogo: React.FC<{ fontSize?: string }> = ({ fontSize = 'clamp(1.1rem, 4.5vw, 2.4rem)' }) => {
  const [showLeftT, setShowLeftT] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLeftT(prev => !prev);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glacial-capsule">
      {/* Symmetric 3-column grid to lock the '&' in the absolute center */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center" style={{ fontSize, width: '100%' }}>
        {/* Left container: Right-aligned text */}
        <div className="flex justify-end pr-4 md:pr-10">
          <div className="swap-t-word whitespace-nowrap">
            <span className={`t-char text-[#0f1a16] ${showLeftT ? 't-visible' : 't-hidden'}`}>T</span>
            <span className="text-[#0f1a16]">HERE</span>
          </div>
        </div>
        
        {/* Perfectly centered separator */}
        <div className="text-[#0f1a16]/10 font-light select-none tracking-[0.4em] flex-shrink-0 flex items-center justify-center min-w-[3ch]">&</div>
        
        {/* Right container: Left-aligned text */}
        <div className="flex justify-start pl-4 md:pl-10">
          <div className="swap-t-word whitespace-nowrap">
            <span className={`t-char text-[#8c6b4f] ${!showLeftT ? 't-visible' : 't-hidden'}`}>T</span>
            <span className="text-[#8c6b4f]">HERE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
