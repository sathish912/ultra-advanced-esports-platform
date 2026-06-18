const TIERS = [
  { id: 'bronze', name: 'Bronze', min: 0, color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.5)' },
  { id: 'silver', name: 'Silver', min: 500, color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.5)' },
  { id: 'gold', name: 'Gold', min: 1500, color: '#ffd700', glow: 'rgba(255, 215, 0, 0.5)' },
  { id: 'platinum', name: 'Platinum', min: 3500, color: '#00f5ff', glow: 'rgba(0, 245, 255, 0.5)' },
  { id: 'diamond', name: 'Diamond', min: 7000, color: '#b24bff', glow: 'rgba(178, 75, 255, 0.55)' },
  { id: 'immortal', name: 'Immortal', min: 12000, color: '#ff2bd6', glow: 'rgba(255, 43, 214, 0.6)' },
];

export function getRankTier(rankingPoints = 0) {
  const points = Math.max(0, Number(rankingPoints) || 0);
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (points >= t.min) tier = t;
  }
  const tierIndex = TIERS.findIndex((t) => t.id === tier.id);
  const next = TIERS[tierIndex + 1];
  const rangeStart = tier.min;
  const rangeEnd = next ? next.min : tier.min + 5000;
  const progress = next
    ? Math.min(100, Math.round(((points - rangeStart) / (rangeEnd - rangeStart)) * 100))
    : 100;
  return { ...tier, points, progress, nextTier: next?.name ?? null, mmr: points };
}

export function getAllTiers() {
  return TIERS;
}
