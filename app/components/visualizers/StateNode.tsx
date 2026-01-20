'use client';

import { motion } from 'framer-motion';

interface StateNodeProps {
  name: string;
  isActive: boolean;
  level?: number;
}

/**
 * Individual state node in the XState tree visualization
 */
export function StateNode({ name, isActive, level = 0 }: StateNodeProps) {
  return (
    <motion.div
      className={`
        text-xs font-mono py-0.5 px-2 rounded transition-all
        ${isActive ? 'bg-green-500/20 text-green-300 font-bold' : 'text-gray-400'}
      `}
      style={{ marginLeft: `${level * 12}px` }}
      animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isActive && '▸ '}{name}
    </motion.div>
  );
}
