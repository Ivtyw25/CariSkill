'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useSpring } from 'framer-motion';
import { initialNodes, initialEdges, mockInitialNodes, mockInitialEdges, ProgressNodeData } from '@/lib/progress-data';
import { ProgressNode } from './ProgressNode';
import { ScrollDrawingEdge } from './ScrollDrawingEdge';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

function FlowGraphContent({ nodes, edges, bounds, onNodeClick }: { nodes: any[], edges: any[], bounds: any, onNodeClick: (n: any) => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start 90%", "end 10%"]
    });

    const smoothScroll = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
    const [scrollThreshold, setScrollThreshold] = useState(200); // Start with 200px revealed

    useEffect(() => {
        const unsubscribe = smoothScroll.on('change', (v) => {
            const newThreshold = (v * bounds.maxY) + 200;
            setScrollThreshold(prev => Math.max(prev, newThreshold));
        });
        return () => unsubscribe();
    }, [smoothScroll, bounds.maxY]);

    return (
        <div className="w-full overflow-x-auto hide-scroll pb-10">
            <div ref={containerRef} className="relative overflow-visible mx-auto" style={{ minHeight: bounds.maxY + 100, width: bounds.maxX }}>
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                    {edges.map((edge, i) => (
                        <ScrollDrawingEdge key={`${edge.source}-${edge.target}-${i}`} {...edge} data={{ status: edge.status, scrollThreshold }} />
                    ))}
                </svg>

                {nodes.map((node) => (
                    <div 
                        key={node.id} 
                        className="absolute" 
                        style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: 10 }}
                        onClick={() => onNodeClick(node)}
                    >
                        <ProgressNode data={{ ...node.data, y: node.y, scrollThreshold }} selected={false} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function FlowGraph() {
    const { user } = useAuth();
    const isMockUser = user?.email === 'mock@example.com';
    const router = useRouter();

    // DB state
    const [dbNodes, setDbNodes] = useState<any[]>([]);
    const [dbEdges, setDbEdges] = useState<any[]>([]);
    const [loadingDb, setLoadingDb] = useState(true);

    useEffect(() => {
        if (isMockUser || !user) {
            setLoadingDb(false);
            return;
        }

        const fetchGraphData = async () => {
            const supabase = createClient();
            const { data: roadmaps, error: rError } = await supabase
                .from('roadmaps')
                .select('id, topic')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (rError || !roadmaps || roadmaps.length === 0) {
                setLoadingDb(false);
                return;
            }

            const latestRoadmapId = roadmaps[0].id;
            const mainTopic = roadmaps[0].topic;

            const [rawNodesRes, rawEdgesRes, progressRes] = await Promise.all([
                supabase.from('roadmap_nodes').select('*').eq('roadmap_id', latestRoadmapId),
                supabase.from('roadmap_edges').select('*').eq('roadmap_id', latestRoadmapId),
                supabase.from('node_progress').select('node_id').eq('user_id', user.id).eq('roadmap_id', latestRoadmapId).eq('is_completed', true),
            ]);

            const rawNodes = rawNodesRes.data;
            const rawEdges = rawEdgesRes.data;
            const completedNodeIds = new Set((progressRes.data || []).map((p: any) => p.node_id));

            const prereqMap = new Map<string, string[]>();
            (rawEdges || []).forEach((e: any) => {
                if (!prereqMap.has(e.target_node_id)) prereqMap.set(e.target_node_id, []);
                prereqMap.get(e.target_node_id)!.push(e.source_node_id);
            });

            if (rawNodes && rawNodes.length > 0) {
                const mappedNodes: any[] = [];
                mappedNodes.push({
                    id: 'user',
                    data: { label: 'Me', icon: 'Crown', status: 'completed', type: 'user', color: '#ffeb3b' },
                });

                const topicNodeId = mainTopic ? mainTopic.toLowerCase().replace(/\s+/g, '-') : 'topic';
                const overallPct = Math.round((completedNodeIds.size / rawNodes.length) * 100);
                const topicStatus = overallPct === 100 ? 'completed' : 'progress';
                mappedNodes.push({
                    id: topicNodeId,
                    data: { label: mainTopic || 'Topic', status: topicStatus, type: 'tech', color: topicStatus === 'completed' ? '#4ade80' : '#4da6ff', percentage: `${overallPct}%` },
                });

                rawNodes.forEach((n: any) => {
                    const isCompleted = completedNodeIds.has(n.node_id);
                    const prereqs = prereqMap.get(n.node_id) || [];
                    const allPrereqsDone = prereqs.length === 0 || prereqs.every(pid => completedNodeIds.has(pid));
                    const nodeStatus = isCompleted ? 'completed' : (allPrereqsDone ? 'progress' : 'locked');
                    const nodeColor = nodeStatus === 'completed' ? '#4ade80' : (nodeStatus === 'progress' ? '#4da6ff' : '#9ca3af');

                    mappedNodes.push({
                        id: n.node_id,
                        data: { label: n.title, status: nodeStatus, type: n.depth_level === 1 ? 'level1' : 'level2', color: nodeColor, topicSlug: topicNodeId },
                    });
                });

                const mappedEdges: any[] = [];
                mappedEdges.push({ source: 'user', target: topicNodeId, status: topicStatus });
                rawNodes.forEach((n: any) => {
                    if (n.depth_level === 1) {
                        const isCompleted = completedNodeIds.has(n.node_id);
                        const edgeStatus = isCompleted ? 'completed' : (prereqMap.get(n.node_id)?.every(pid => completedNodeIds.has(pid)) === false ? 'locked' : 'progress');
                        mappedEdges.push({ source: topicNodeId, target: n.node_id, status: edgeStatus });
                    }
                });
                if (rawEdges) {
                    rawEdges.forEach((e: any) => {
                        const isCompleted = completedNodeIds.has(e.target_node_id);
                        const edgeStatus = isCompleted ? 'completed' : (completedNodeIds.has(e.source_node_id) ? 'progress' : 'locked');
                        mappedEdges.push({ source: e.source_node_id, target: e.target_node_id, status: edgeStatus });
                    });
                }
                setDbNodes(mappedNodes);
                setDbEdges(mappedEdges);
            }
            setDbNodes(prev => prev.length > 0 ? prev : []); // Trigger re-render even if empty
            setDbEdges(prev => prev.length > 0 ? prev : []);
            setLoadingDb(false);
        };
        fetchGraphData();
    }, [user, isMockUser]);

    const activeNodesData = isMockUser ? mockInitialNodes : (dbNodes.length > 0 ? dbNodes : initialNodes);
    const activeEdgesData = isMockUser ? mockInitialEdges : (dbNodes.length > 0 ? dbEdges : initialEdges);

    const layoutData = useMemo(() => {
        if (loadingDb) return { nodes: [], edges: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };

        const nodeMap = new Map();
        activeNodesData.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
        
        const edgeList: any[] = [];
        activeEdgesData.forEach((e: any) => {
            const source = e.source || e.source_node_id;
            const target = e.target || e.target_node_id;
            if (nodeMap.has(source) && nodeMap.has(target)) {
                nodeMap.get(source).children.push(target);
                edgeList.push({ source, target, status: e.data?.status || e.status || 'locked' });
            }
        });

        const depths = new Map();
        const queue: any[] = [{ id: 'user', d: 0 }];
        depths.set('user', 0);
        while (queue.length > 0) {
            const { id, d } = queue.shift();
            const children = nodeMap.get(id)?.children || [];
            children.forEach((cid: string) => {
                if (!depths.has(cid)) {
                    depths.set(cid, d + 1);
                    queue.push({ id: cid, d: d + 1 });
                }
            });
        }

        const nodesByDepth: Map<number, any[]> = new Map();
        nodeMap.forEach((node, id) => {
            const d = depths.get(id) ?? 0;
            if (!nodesByDepth.has(d)) nodesByDepth.set(d, []);
            nodesByDepth.get(d)!.push(node);
        });

        const X_GAP = 180;
        const Y_GAP = 220;
        
        let maxNodesInLevel = 0;
        nodesByDepth.forEach(list => maxNodesInLevel = Math.max(maxNodesInLevel, list.length));
        
        const width = Math.max(1200, maxNodesInLevel * X_GAP + 200);
        const CENTER_X = width / 2;

        const layoutNodes: any[] = [];
        const nodePositions = new Map();

        nodesByDepth.forEach((list, d) => {
            const totalWidth = (list.length - 1) * X_GAP;
            const startX = CENTER_X - totalWidth / 2;
            list.forEach((node, i) => {
                const x = startX + i * X_GAP;
                const y = d * Y_GAP + 80;
                nodePositions.set(node.id, { x, y });
                layoutNodes.push({ ...node, x, y });
            });
        });

        return {
            nodes: layoutNodes,
            edges: edgeList.map(e => ({
                ...e,
                sourceX: nodePositions.get(e.source).x,
                sourceY: nodePositions.get(e.source).y,
                targetX: nodePositions.get(e.target).x,
                targetY: nodePositions.get(e.target).y,
            })),
            bounds: { minX: 0, maxX: width, minY: 0, maxY: (nodesByDepth.size) * Y_GAP + 100 }
        };
    }, [activeNodesData, activeEdgesData, loadingDb]);

    const onNodeClick = (node: any) => {
        const data = node.data as ProgressNodeData;
        if (data.status !== 'locked' && data.type !== 'user') {
            const topicSlug = data.topicSlug;
            if (topicSlug) router.push(`/skill/${topicSlug}?highlight=${node.id}`);
            else router.push(`/skill/${node.id}`);
        }
    };

    if (loadingDb) return <div className="w-full h-[600px] flex items-center justify-center">Loading...</div>;

    return <FlowGraphContent {...layoutData} onNodeClick={onNodeClick} />;
}
