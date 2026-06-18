import React from 'react';
import { getRankTier } from '../../utils/rankTier';
import { motion } from 'framer-motion';

const sizeMap = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-3 py-1',
  lg: 'text-sm px-4 py-1.5',
};

export default function RankBadge({ points = 0, size = 'md', showProgress = false, className = '' }) {
  const tier = getRankTier(points);

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`font-display font-black uppercase tracking-widest rounded-full border ${sizeMap[size]}`}
        style={{
          color: tier.color,
          borderColor: `${tier.color}55`,
          backgroundColor: `${tier.color}15`,
          boxShadow: `0 0 12px ${tier.glow}`,
        }}
      >
        {tier.name}
      </span>
      {showProgress && tier.nextTier && (
        <div className="w-full min-w-[80px] h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tier.progress}%` }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${tier.color}, ${tier.color}88)` }}
          />
        </div>
      )}
    </div>
  );
}
