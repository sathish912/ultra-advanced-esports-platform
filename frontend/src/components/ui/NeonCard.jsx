import React from 'react';
import { motion } from 'framer-motion';

const accents = {
  cyan: 'from-primary/20 to-transparent border-primary/25 hover:shadow-[0_0_30px_rgba(0,245,255,0.15)]',
  magenta: 'from-secondary/20 to-transparent border-secondary/25 hover:shadow-[0_0_30px_rgba(255,43,214,0.15)]',
  purple: 'from-accent/20 to-transparent border-accent/25 hover:shadow-[0_0_30px_rgba(178,75,255,0.15)]',
  gold: 'from-neonGold/20 to-transparent border-neonGold/25 hover:shadow-[0_0_30px_rgba(255,215,0,0.12)]',
};

export default function NeonCard({
  children,
  className = '',
  accent = 'cyan',
  delay = 0,
  onClick,
  as: Component = motion.div,
}) {
  return (
    <Component
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
      onClick={onClick}
      className={`glass-panel rounded-2xl p-6 border bg-gradient-to-br transition-all duration-300 ${accents[accent] || accents.cyan} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
