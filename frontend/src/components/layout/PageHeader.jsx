import React from 'react';
import { motion } from 'framer-motion';

export default function PageHeader({ badge, title, subtitle, children }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-10 pb-8 border-b border-white/10"
    >
      {badge && (
        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
          {badge}
        </span>
      )}
      <h1 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight neon-text-cyan">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-textMuted max-w-2xl">{subtitle}</p>}
      {children && <div className="mt-6">{children}</div>}
    </motion.header>
  );
}
