'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
    Node,
    Edge,
    NodeMouseHandler,
    Position,
    useReactFlow,
} from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { initialNodes, initialEdges, mockInitialNodes, mockInitialEdges, ProgressNodeData } from '@/lib/progress-data';
import { ProgressNode } from './ProgressNode';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import dagre from 'dagre';

const nodeTypes = {
    progressNode: ProgressNode,
};

// Computes auto-layout based on ranks (BT = bottom to top)
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    // 1. Build relationships to compute animation depths
    const childrenMap = new Map<string, string[]>();
    nodes.forEach(n => childrenMap.set(n.id, []));
    edges.forEach(e => {
        if (childrenMap.has(e.source)) {
            childrenMap.get(e.source)!.push(e.target);
        }
    });

    const depths = new Map<string, number>();
    depths.set('user', 0);
    const queue = ['user'];
    while (queue.length > 0) {
        const curr = queue.shift()!;
        const currentDepth = depths.get(curr)!;
        const children = childrenMap.get(curr) || [];
        children.forEach(child => {
            if (!depths.has(child)) {
                depths.set(child, currentDepth + 1);
                queue.push(child);
            }
        });
    }

    // 2. Dagre Layout (Reverse Tree, Bottom-To-Top)
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: 'BT', // Bottom-to-Top
        nodesep: 80,   // Reduced horizontal spacing between neighbors
        ranksep: 120,   // Reduced vertical spacing between levels
        align: 'UL',
    });

    // Populate dagre
    nodes.forEach((node) => {
        let size = 64;
        if (node.data.type === 'user') size = 80;
        else if (node.data.type === 'category') size = 72;
        else if (node.data.type === 'tech') size = 64;
        else if (node.data.type === 'level1') size = 56;
        else size = 48;

        dagreGraph.setNode(node.id, { width: size, height: size });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate Directed Acyclic Graph Layout
    dagre.layout(dagreGraph);

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Apply dagre calculated coordinates and add cosmetic organic jitter
    const newNodes = nodes.map((node) => {
        const nodePosition = dagreGraph.node(node.id);
        const newNode = { ...node };

        delete newNode.targetPosition;
        delete newNode.sourcePosition;

        // Deterministic pseudo-random jitter based on node ID to make the tree look less rigid/robotic
        let hash = 0;
        for (let i = 0; i < node.id.length; i++) hash += node.id.charCodeAt(i);
        const randX = (Math.sin(hash) * 15);
        const randY = (Math.cos(hash) * 10);

        newNode.position = {
            x: nodePosition.x - (nodePosition.width / 2) + randX,
            y: nodePosition.y - (nodePosition.height / 2) + randY,
        };

        newNode.data = { ...newNode.data, depth: depths.get(node.id) || 0 };

        if (newNode.position.x < minX) minX = newNode.position.x;
        if (newNode.position.y < minY) minY = newNode.position.y;
        if (newNode.position.x > maxX) maxX = newNode.position.x;
        if (newNode.position.y > maxY) maxY = newNode.position.y;

        return newNode;
    });

    const newEdges = edges.map(edge => ({
        ...edge,
        data: { ...edge.data, sourceDepth: depths.get(edge.source) || 0 },
        type: 'straight' // Strictly straight lines per user request
    }));

    const bounds = {
        minX: minX === Infinity ? -1000 : minX - 400,
        minY: minY === Infinity ? -1000 : minY - 400,
        maxX: maxX === -Infinity ? 1000 : maxX + 400,
        maxY: maxY === -Infinity ? 1000 : maxY + 400,
    };

    return { nodes: newNodes, edges: newEdges, bounds };
};

export default function FlowGraph() {
    const { user } = useAuth();
    const isMockUser = user?.email === 'mock@example.com';

    // DB state
    const [dbNodes, setDbNodes] = useState<Node[]>([]);
    const [dbEdges, setDbEdges] = useState<Edge[]>([]);
    const [loadingDb, setLoadingDb] = useState(true);

    useEffect(() => {
        if (isMockUser || !user) {
            setLoadingDb(false);
            return;
        }

        const fetchGraphData = async () => {
            const supabase = createClient();

            // 1. Get the latest roadmap for the user
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

            // 2. Fetch nodes, edges and user progress in parallel
            const [rawNodesRes, rawEdgesRes, progressRes] = await Promise.all([
                supabase.from('roadmap_nodes').select('*').eq('roadmap_id', latestRoadmapId),
                supabase.from('roadmap_edges').select('*').eq('roadmap_id', latestRoadmapId),
                supabase.from('node_progress').select('node_id').eq('user_id', user.id).eq('roadmap_id', latestRoadmapId).eq('is_completed', true),
            ]);

            const rawNodes = rawNodesRes.data;
            const rawEdges = rawEdgesRes.data;
            const nError = rawNodesRes.error;
            const completedNodeIds = new Set((progressRes.data || []).map((p: any) => p.node_id));

            // Build prerequisite map: targetNodeId -> [sourceNodeIds]
            const prereqMap = new Map<string, string[]>();
            (rawEdges || []).forEach((e: any) => {
                if (!prereqMap.has(e.target_node_id)) prereqMap.set(e.target_node_id, []);
                prereqMap.get(e.target_node_id)!.push(e.source_node_id);
            });

            if (!nError && rawNodes && rawNodes.length > 0) {
                // Map DB nodes to React Flow format
                const mappedNodes: Node<ProgressNodeData>[] = [];

                // 1. Absolute Root: "Me"
                mappedNodes.push({
                    id: 'user',
                    position: { x: 0, y: 0 },
                    data: { label: 'Me', icon: 'Crown', status: 'completed', type: 'user', color: '#ffeb3b' },
                    type: 'progressNode',
                });

                // 2. Level 1 Root: The Main Topic
                const topicNodeId = mainTopic ? mainTopic.toLowerCase().replace(/\s+/g, '-') : 'topic';
                // Overall percentage = completed nodes / total nodes
                const overallPct = rawNodes.length > 0
                    ? Math.round((completedNodeIds.size / rawNodes.length) * 100)
                    : 0;
                const topicStatus = overallPct === 100 ? 'completed' : 'progress';
                mappedNodes.push({
                    id: topicNodeId,
                    position: { x: 0, y: 0 },
                    data: {
                        label: mainTopic || 'Topic',
                        status: topicStatus,
                        type: 'tech',
                        color: topicStatus === 'completed' ? '#4ade80' : '#4da6ff',
                        percentage: `${overallPct}%`,
                        isCollapsible: true,
                        isCollapsed: false
                    },
                    type: 'progressNode',
                });

                // 3. All DB Nodes with real status computed from progress + prereqs
                rawNodes.forEach((n: any) => {
                    const isCompleted = completedNodeIds.has(n.node_id);
                    const prereqs = prereqMap.get(n.node_id) || [];
                    const allPrereqsDone = prereqs.length === 0 || prereqs.every(pid => completedNodeIds.has(pid));

                    let nodeStatus: 'completed' | 'progress' | 'locked';
                    let nodeColor: string;
                    if (isCompleted) {
                        nodeStatus = 'completed';
                        nodeColor = '#4ade80'; // green
                    } else if (allPrereqsDone) {
                        nodeStatus = 'progress';
                        nodeColor = '#4da6ff'; // blue
                    } else {
                        nodeStatus = 'locked';
                        nodeColor = '#9ca3af'; // grey
                    }

                    mappedNodes.push({
                        id: n.node_id,
                        position: { x: 0, y: 0 },
                        data: {
                            label: n.title,
                            status: nodeStatus,
                            type: n.depth_level === 1 ? 'level1' : 'level2',
                            color: nodeColor,
                            isCollapsible: true,
                            isCollapsed: false,
                            topicSlug: topicNodeId,
                        },
                        type: 'progressNode',
                    });
                });

                const mappedEdges: Edge[] = [];

                // Link "Me" -> "Topic"
                mappedEdges.push({
                    id: `e-user-topic`,
                    source: 'user',
                    target: topicNodeId,
                    type: 'straight',
                    animated: false,
                    className: 'animate-draw-line',
                    style: { strokeWidth: 3, stroke: '#4da6ff' },
                });

                // Link "Topic" -> All Initial AI Modules (depth_level === 1)
                rawNodes.forEach((n: any) => {
                    if (n.depth_level === 1) {
                        mappedEdges.push({
                            id: `e-topic-${n.node_id}`,
                            source: topicNodeId,
                            target: n.node_id,
                            type: 'straight',
                            animated: false,
                            className: 'animate-draw-line',
                            style: { strokeWidth: 3, stroke: '#4da6ff' },
                        });
                    }
                });

                // Add DB edges (Level 2 dependencies)
                if (rawEdges) {
                    rawEdges.forEach((e: any) => {
                        mappedEdges.push({
                            id: `e-${e.source_node_id}-${e.target_node_id}`,
                            source: e.source_node_id,
                            target: e.target_node_id,
                            type: 'straight',
                            animated: false,
                            className: 'animate-draw-line',
                            style: { strokeWidth: 3, stroke: '#4da6ff' },
                        });
                    });
                }

                setDbNodes(mappedNodes);
                setDbEdges(mappedEdges);
            }

            setLoadingDb(false);
        };

        fetchGraphData();
    }, [user, isMockUser]);

    const activeNodes = isMockUser ? mockInitialNodes : (dbNodes.length > 0 ? dbNodes : initialNodes);
    const activeEdges = isMockUser ? mockInitialEdges : (dbNodes.length > 0 ? dbEdges : initialEdges);

    const { nodes: layoutedNodes, edges: layoutedEdges, bounds } = useMemo(() => {
        if (loadingDb) return { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
        return getLayoutedElements(activeNodes, activeEdges);
    }, [activeNodes, activeEdges, loadingDb]);

    const [nodes, setNodes] = useState<Node[]>(layoutedNodes);
    const [edges, setEdges] = useState<Edge[]>(layoutedEdges);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    useEffect(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [layoutedNodes, layoutedEdges]);

    const router = useRouter();

    const onNodeClick: NodeMouseHandler = useCallback((event, clickedNode) => {
        const data = clickedNode.data as ProgressNodeData;
        const target = event.target as HTMLElement;

        if (target.closest('.collapse-toggle-btn')) {
            if (data.isCollapsible && data.status !== 'locked') {
                const isCurrentlyCollapsed = data.isCollapsed;
                setNodes((currentNodes) => {
                    return currentNodes.map((n) => {
                        if (n.id === clickedNode.id) {
                            return {
                                ...n,
                                data: { ...n.data, isCollapsed: !isCurrentlyCollapsed }
                            };
                        }
                        return n;
                    });
                });
            }
            return;
        }

        if (data.status !== 'locked' && data.type !== 'user' && data.type !== 'category') {
            // If node has a topicSlug stored, route to parent topic page with highlight
            // Otherwise route to the node itself (e.g. the Topic node)
            const topicSlug = data.topicSlug as string | undefined;
            if (topicSlug) {
                router.push(`/skill/${topicSlug}?highlight=${clickedNode.id}`);
            } else {
                router.push(`/skill/${clickedNode.id}`);
            }
        }
    }, [router]);

    const visibleNodes = useMemo(() => {
        const hiddenNodeIds = new Set<string>();

        const childrenMap = new Map<string, string[]>();
        edges.forEach(e => {
            if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
            childrenMap.get(e.source)!.push(e.target);
        });

        const traverseAndHide = (nodeId: string) => {
            const children = childrenMap.get(nodeId) || [];
            children.forEach(childId => {
                hiddenNodeIds.add(childId);
                traverseAndHide(childId);
            });
        };

        nodes.forEach(node => {
            const data = node.data as ProgressNodeData;
            if (data.isCollapsed && !hiddenNodeIds.has(node.id)) {
                traverseAndHide(node.id);
            }
        });

        return nodes.filter(n => !hiddenNodeIds.has(n.id));

    }, [nodes, edges]);

    const visibleEdges = useMemo(() => {
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)).map(e => ({
            ...e,
            style: {
                ...e.style,
                animationDelay: `${(e.data?.sourceDepth as number || 0) * 0.3}s`
            }
        }));
    }, [visibleNodes, edges]);


    function ZoomControls() {
        const { zoomIn, zoomOut, fitView } = useReactFlow();

        return (
            <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-10">
                <button
                    onClick={() => zoomIn({ duration: 300 })}
                    className="bg-white p-3 rounded-xl shadow-lg border border-gray-100/50 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 group"
                    aria-label="Zoom In"
                >
                    <ZoomIn className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                </button>
                <button
                    onClick={() => zoomOut({ duration: 300 })}
                    className="bg-white p-3 rounded-xl shadow-lg border border-gray-100/50 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 group"
                    aria-label="Zoom Out"
                >
                    <ZoomOut className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                </button>
                <button
                    onClick={() => fitView({ duration: 800, padding: 0.3 })}
                    className="bg-white p-3 rounded-xl shadow-lg border border-gray-100/50 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 group mt-2"
                    aria-label="Fit View"
                >
                    <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-[1200px] relative">
            <ReactFlow
                nodes={visibleNodes}
                edges={visibleEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                zoomOnDoubleClick={false}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag={true}
                preventScrolling={false}
                translateExtent={[[bounds.minX, bounds.minY], [bounds.maxX, bounds.maxY]]}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.2}
                maxZoom={1.5}
                proOptions={{ hideAttribution: true }}
            >
                <ZoomControls />
            </ReactFlow>
        </div>
    );
}
