'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function ScrollDrawingEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  data: any;
}) {
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  const status = data?.status || 'locked';
  const color = status === 'locked' ? '#d1d5db' : '#4da6ff';
  
  const scrollThreshold = data?.scrollThreshold || 0;
  
  // Calculate how much of the line should be visible
  // We want it to "draw" from source to target.
  // The visibility is 1 if targetY <= scrollThreshold, 0 if sourceY >= scrollThreshold
  const visibility = Math.max(0, Math.min(1, (scrollThreshold - sourceY) / (targetY - sourceY || 1)));

  return (
    <motion.path
      d={edgePath}
      stroke={color}
      strokeWidth={3}
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: visibility }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    />
  );
}
