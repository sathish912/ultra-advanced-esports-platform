import React, { useMemo } from 'react';

export default function ParticleField({ count = 40, className = '' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 5,
        color: ['#00f5ff', '#ff2bd6', '#b24bff', '#ffd700'][i % 4],
      })),
    [count]
  );

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden z-0 ${className}`} aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.03] grid-scan"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)' }}
      />
    </div>
  );
}
