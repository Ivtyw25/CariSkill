import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Crown, Network, Lock, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ProgressNodeData } from '@/lib/progress-data';

export const ProgressNode = memo(({ data, selected }: { data: ProgressNodeData, selected: boolean }) => {
    const isCompleted = data.status === 'completed';
    const isInProgress = data.status === 'progress';
    const isLocked = data.status === 'locked';
    const color = data.color || '#e5e7eb';

    const breathingGlow = {
        animate: { boxShadow: `0px 0px 20px 8px ${color}80`, opacity: [0.3, 0.7, 0.3] },
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    };

    const depth = (data as any).depth || 0;
    const IconComponent = data.icon ? (LucideIcons as any)[data.icon] : null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: depth * 0.3 }}
            className={`relative flex flex-col items-center justify-center group ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >

            {data.type !== 'user' && (
                <Handle type="target" position={Position.Top} className="!w-1 !h-1 !bg-transparent border-none !opacity-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: -1 }} />
            )}

            {(isInProgress || data.type === 'user') && (
                <motion.div animate={breathingGlow.animate} transition={breathingGlow.transition} className="absolute inset-0 rounded-full" />
            )}

            <div
                className={`relative z-10 flex items-center justify-center rounded-full transition-transform duration-300
          ${selected ? 'scale-110' : 'group-hover:scale-105'}
          ${data.type === 'user' ? 'w-20 h-20' : data.type === 'category' ? 'w-16 h-16' : data.type === 'tech' ? 'w-16 h-16' : data.type === 'level1' ? 'w-14 h-14' : 'w-12 h-12'}
        `}
                style={{
                    backgroundColor: isCompleted ? color : isLocked ? '#f9fafb' : '#ffffff',
                    border: `4px solid ${isLocked ? '#d1d5db' : color}`,
                    boxShadow: isCompleted ? `0 4px 14px ${color}60` : 'none',
                }}
            >
                {data.type === 'user' && <Crown className="w-8 h-8 text-black" />}
                {data.type === 'category' && IconComponent && <IconComponent className="w-6 h-6" style={{ color: isCompleted ? '#ffffff' : color }} />}
                {data.type === 'category' && !IconComponent && <Network className="w-6 h-6" style={{ color: isCompleted ? '#ffffff' : color }} />}
                {data.type !== 'user' && data.type !== 'category' && isCompleted && <Check className="w-6 h-6 text-white stroke-[3]" />}
                {data.type !== 'user' && data.type !== 'category' && isInProgress && <span className="text-xs font-bold" style={{ color: color }}>{data.percentage || '0%'}</span>}
                {data.type !== 'user' && data.type !== 'category' && isLocked && <Lock className="w-4 h-4 text-gray-400" />}
            </div>

            {data.label && (
                <div className={`absolute top-full mt-4 flex items-center justify-center gap-1 whitespace-nowrap px-3 py-1 text-sm font-bold rounded-full bg-white border border-gray-200 shadow-sm z-50
          ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                    {data.label}
                    {data.type === 'category' && data.percentage && (
                        <span style={{ color: color }} className="ml-1">{data.percentage}</span>
                    )}
                </div>
            )}

            {data.isCollapsible && (
                <div className="collapse-toggle-btn absolute -right-2 -top-2 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm z-20 hover:scale-110 hover:bg-gray-100 transition-transform">
                    {data.isCollapsed ? '+' : '-'}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!w-1 !h-1 !bg-transparent border-none !opacity-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: -1 }} />

        </motion.div>
    );
});

ProgressNode.displayName = 'ProgressNode';
