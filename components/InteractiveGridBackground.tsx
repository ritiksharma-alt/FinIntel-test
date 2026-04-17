import React, { useEffect, useRef, useCallback } from 'react';

/**
 * InteractiveGridBackground
 * 
 * Pure CSS grid background (Aceternity-style) with a cursor-reactive
 * spotlight glow that illuminates grid lines as you hover.
 */
const InteractiveGridBackground: React.FC = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mousePos = useRef({ x: -1000, y: -1000 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty('--spotlight-x', `${mousePos.current.x}px`);
        spotlightRef.current.style.setProperty('--spotlight-y', `${mousePos.current.y}px`);
        spotlightRef.current.style.opacity = '1';
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (spotlightRef.current) {
      spotlightRef.current.style.opacity = '0';
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* CSS Grid lines — Aceternity style */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '45px 45px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 25%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 25%, transparent 80%)',
        }}
      />

      {/* Cursor spotlight — brighter grid lines near mouse */}
      <div
        ref={spotlightRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(20, 184, 166, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20, 184, 166, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '45px 45px',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          maskImage: 'radial-gradient(450px circle at var(--spotlight-x, -1000px) var(--spotlight-y, -1000px), black 0%, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(450px circle at var(--spotlight-x, -1000px) var(--spotlight-y, -1000px), black 0%, transparent 65%)',
        }}
      />

      {/* Soft teal ambient glow at top */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(20, 184, 166, 0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default InteractiveGridBackground;
