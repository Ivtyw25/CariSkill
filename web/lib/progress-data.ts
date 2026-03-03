// lib/progress-data.ts
import { Node, Edge } from '@xyflow/react';

export type NodeStatus = 'completed' | 'progress' | 'locked';
export type NodeType = 'user' | 'category' | 'tech' | 'level1' | 'level2' | 'level3';

export type ProgressNodeData = {
  label: string;
  icon?: string;
  status: NodeStatus;
  type: NodeType;
  color?: string;
  percentage?: string;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  topicSlug?: string;
};

// We assign a default position of { x: 0, y: 0 }, dagre will overwrite these
// The fully populated tree is backed up here for the mock user
export const mockInitialNodes: Node<ProgressNodeData>[] = [
  // --- ROOT (The User) ---
  {
    id: 'user',
    position: { x: 0, y: 0 },
    data: { label: 'Me', icon: 'Crown', status: 'completed', type: 'user', color: '#ffeb3b' },
    type: 'progressNode',
  },

  // --- CATEGORY ---
  {
    id: 'category-tech',
    position: { x: 0, y: 0 },
    data: { label: 'Tech / Code', icon: 'Code', status: 'completed', type: 'category', color: '#4da6ff' },
    type: 'progressNode',
  },

  // --- TECH BRANCH 1: Python ---
  {
    id: 'tech-python',
    position: { x: 0, y: 0 },
    data: { label: 'Python', status: 'completed', type: 'tech', color: '#4da6ff', isCollapsible: true, isCollapsed: false },
    type: 'progressNode',
  },

  // Python Level 1
  {
    id: 'py-lvl1-syntax',
    position: { x: 0, y: 0 },
    data: { label: 'Basic Syntax', status: 'completed', type: 'level1', color: '#4da6ff' },
    type: 'progressNode',
  },
  {
    id: 'py-lvl1-func',
    position: { x: 0, y: 0 },
    data: { label: 'Functions', status: 'completed', type: 'level1', color: '#4da6ff' },
    type: 'progressNode',
  },
  {
    id: 'py-lvl1-libs',
    position: { x: 0, y: 0 },
    data: { label: 'Libraries (Requests)', status: 'progress', type: 'level1', color: '#4da6ff', percentage: '30%' },
    type: 'progressNode',
  },

  // Python Level 2 (Requires Syntax and Functions)
  {
    id: 'py-lvl2-class',
    position: { x: 0, y: 0 },
    data: { label: 'Classes & OOP', status: 'progress', type: 'level2', color: '#4da6ff', percentage: '40%' },
    type: 'progressNode',
  },
  {
    id: 'py-lvl2-data',
    position: { x: 0, y: 0 },
    data: { label: 'Data Structures', status: 'locked', type: 'level2', color: '#4da6ff' },
    type: 'progressNode',
  },

  // --- TECH BRANCH 2: C++ ---
  {
    id: 'tech-cpp',
    position: { x: 0, y: 0 },
    data: { label: 'C++', status: 'progress', type: 'tech', color: '#4da6ff', percentage: '15%', isCollapsible: true, isCollapsed: false },
    type: 'progressNode',
  },

  // C++ Level 1
  {
    id: 'cpp-lvl1-pointers',
    position: { x: 0, y: 0 },
    data: { label: 'Pointers', status: 'progress', type: 'level1', color: '#4da6ff', percentage: '20%' },
    type: 'progressNode',
  },
  {
    id: 'cpp-lvl1-mem',
    position: { x: 0, y: 0 },
    data: { label: 'Memory Mgmt', status: 'locked', type: 'level1', color: '#4da6ff' },
    type: 'progressNode',
  },

  // C++ Level 2
  {
    id: 'cpp-lvl2-stl',
    position: { x: 0, y: 0 },
    data: { label: 'STL', status: 'locked', type: 'level2', color: '#4da6ff' },
    type: 'progressNode',
  },

  // --- TECH BRANCH 3: Java ---
  {
    id: 'tech-java',
    position: { x: 0, y: 0 },
    data: { label: 'Java', status: 'locked', type: 'tech', color: '#4da6ff', isCollapsible: true, isCollapsed: true },
    type: 'progressNode',
  },

  // Java Level 1
  {
    id: 'java-lvl1-jvm',
    position: { x: 0, y: 0 },
    data: { label: 'JVM Basics', status: 'locked', type: 'level1', color: '#4da6ff' },
    type: 'progressNode',
  },

  // --- CATEGORY 2: Design ---
  {
    id: 'category-design',
    position: { x: 0, y: 0 },
    data: { label: 'Design / UX', icon: 'PenTool', status: 'completed', type: 'category', color: '#ec4899' }, // Pink
    type: 'progressNode',
  },

  // Design Skills
  {
    id: 'design-uiux',
    position: { x: 0, y: 0 },
    data: { label: 'UI/UX Basics', status: 'completed', type: 'tech', color: '#ec4899', isCollapsible: true, isCollapsed: false },
    type: 'progressNode',
  },
  {
    id: 'design-figma',
    position: { x: 0, y: 0 },
    data: { label: 'Figma', status: 'progress', type: 'level1', color: '#ec4899', percentage: '60%' },
    type: 'progressNode',
  },
  {
    id: 'design-color',
    position: { x: 0, y: 0 },
    data: { label: 'Color Theory', status: 'completed', type: 'level1', color: '#ec4899' },
    type: 'progressNode',
  },
  {
    id: 'design-proto',
    position: { x: 0, y: 0 },
    data: { label: 'Prototyping', status: 'locked', type: 'level2', color: '#ec4899' },
    type: 'progressNode',
  },

  // --- CATEGORY 3: Data Science ---
  {
    id: 'category-data',
    position: { x: 0, y: 0 },
    data: { label: 'Data Science', icon: 'Database', status: 'completed', type: 'category', color: '#10b981' }, // Green
    type: 'progressNode',
  },

  // Data Skills
  {
    id: 'data-sql',
    position: { x: 0, y: 0 },
    data: { label: 'SQL', status: 'completed', type: 'tech', color: '#10b981', isCollapsible: true, isCollapsed: false },
    type: 'progressNode',
  },
  {
    id: 'data-pandas',
    position: { x: 0, y: 0 },
    data: { label: 'Pandas', status: 'progress', type: 'level1', color: '#10b981', percentage: '80%' },
    type: 'progressNode',
  },
  {
    id: 'data-viz',
    position: { x: 0, y: 0 },
    data: { label: 'Data Viz (Matplotlib)', status: 'progress', type: 'level1', color: '#10b981', percentage: '50%' },
    type: 'progressNode',
  },
  {
    id: 'data-ml',
    position: { x: 0, y: 0 },
    data: { label: 'Machine Learning', status: 'locked', type: 'level2', color: '#10b981' },
    type: 'progressNode',
  },

  // --- CATEGORY 4: Soft Skills ---
  {
    id: 'category-soft',
    position: { x: 0, y: 0 },
    data: { label: 'Soft Skills', icon: 'Users', status: 'completed', type: 'category', color: '#f59e0b' }, // Amber
    type: 'progressNode',
  },

  // Soft Skills
  {
    id: 'soft-comm',
    position: { x: 0, y: 0 },
    data: { label: 'Communication', status: 'completed', type: 'tech', color: '#f59e0b', isCollapsible: true, isCollapsed: false },
    type: 'progressNode',
  },
  {
    id: 'soft-agile',
    position: { x: 0, y: 0 },
    data: { label: 'Agile', status: 'completed', type: 'level1', color: '#f59e0b' },
    type: 'progressNode',
  },
  {
    id: 'soft-present',
    position: { x: 0, y: 0 },
    data: { label: 'Public Speaking', status: 'progress', type: 'level1', color: '#f59e0b', percentage: '30%' },
    type: 'progressNode',
  },
  {
    id: 'soft-lead',
    position: { x: 0, y: 0 },
    data: { label: 'Leadership', status: 'locked', type: 'level2', color: '#f59e0b' },
    type: 'progressNode',
  },
];

// Reusable styling for edges that curve gently around nodes
const edgeStyle = (color: string) => ({
  type: 'straight', // Straight, non-curved edges
  animated: false,
  className: 'animate-draw-line',
  style: { strokeWidth: 3, stroke: color },
});

export const mockInitialEdges: Edge[] = [
  // User -> Category
  { id: 'e-user-category-tech', source: 'user', target: 'category-tech', ...edgeStyle('#4da6ff') },

  // Category -> Branches
  { id: 'e-category-python', source: 'category-tech', target: 'tech-python', ...edgeStyle('#4da6ff') },
  { id: 'e-category-cpp', source: 'category-tech', target: 'tech-cpp', ...edgeStyle('#4da6ff') },
  { id: 'e-category-java', source: 'category-tech', target: 'tech-java', ...edgeStyle('#4da6ff') },

  // --- PYTHON PATH ---
  // Tech -> Lvl 1
  { id: 'e-py-tech-syntax', source: 'tech-python', target: 'py-lvl1-syntax', ...edgeStyle('#4da6ff') },
  { id: 'e-py-tech-func', source: 'tech-python', target: 'py-lvl1-func', ...edgeStyle('#4da6ff') },
  { id: 'e-py-tech-libs', source: 'tech-python', target: 'py-lvl1-libs', ...edgeStyle('#4da6ff') },
  // Lvl 1 -> Lvl 2 (Multiple Prereqs)
  { id: 'e-py-syntax-class', source: 'py-lvl1-syntax', target: 'py-lvl2-class', ...edgeStyle('#4da6ff') },
  { id: 'e-py-func-class', source: 'py-lvl1-func', target: 'py-lvl2-class', ...edgeStyle('#4da6ff') },
  { id: 'e-py-syntax-data', source: 'py-lvl1-syntax', target: 'py-lvl2-data', ...edgeStyle('#4da6ff') },

  // --- C++ PATH ---
  // Tech -> Lvl 1
  { id: 'e-cpp-tech-pointers', source: 'tech-cpp', target: 'cpp-lvl1-pointers', ...edgeStyle('#4da6ff') },
  { id: 'e-cpp-tech-mem', source: 'tech-cpp', target: 'cpp-lvl1-mem', ...edgeStyle('#4da6ff') },
  // Lvl 1 -> Lvl 2
  { id: 'e-cpp-pointers-stl', source: 'cpp-lvl1-pointers', target: 'cpp-lvl2-stl', ...edgeStyle('#4da6ff') },
  { id: 'e-cpp-mem-stl', source: 'cpp-lvl1-mem', target: 'cpp-lvl2-stl', ...edgeStyle('#4da6ff') },

  // --- JAVA PATH ---
  // Tech -> Lvl 1
  { id: 'e-java-tech-jvm', source: 'tech-java', target: 'java-lvl1-jvm', ...edgeStyle('#4da6ff') },

  // --- DESIGN EDGES ---
  { id: 'e-user-cat-design', source: 'user', target: 'category-design', ...edgeStyle('#ec4899') },
  { id: 'e-cat-design-uiux', source: 'category-design', target: 'design-uiux', ...edgeStyle('#ec4899') },
  { id: 'e-uiux-figma', source: 'design-uiux', target: 'design-figma', ...edgeStyle('#ec4899') },
  { id: 'e-uiux-color', source: 'design-uiux', target: 'design-color', ...edgeStyle('#ec4899') },
  { id: 'e-figma-proto', source: 'design-figma', target: 'design-proto', ...edgeStyle('#ec4899') },

  // --- DATA EDGES ---
  { id: 'e-user-cat-data', source: 'user', target: 'category-data', ...edgeStyle('#10b981') },
  { id: 'e-cat-data-sql', source: 'category-data', target: 'data-sql', ...edgeStyle('#10b981') },
  { id: 'e-sql-pandas', source: 'data-sql', target: 'data-pandas', ...edgeStyle('#10b981') },
  { id: 'e-sql-viz', source: 'data-sql', target: 'data-viz', ...edgeStyle('#10b981') },
  { id: 'e-pandas-ml', source: 'data-pandas', target: 'data-ml', ...edgeStyle('#10b981') },

  // --- SOFT SKILL EDGES ---
  { id: 'e-user-cat-soft', source: 'user', target: 'category-soft', ...edgeStyle('#f59e0b') },
  { id: 'e-cat-soft-comm', source: 'category-soft', target: 'soft-comm', ...edgeStyle('#f59e0b') },
  { id: 'e-comm-agile', source: 'soft-comm', target: 'soft-agile', ...edgeStyle('#f59e0b') },
  { id: 'e-comm-present', source: 'soft-comm', target: 'soft-present', ...edgeStyle('#f59e0b') },
  { id: 'e-agile-lead', source: 'soft-agile', target: 'soft-lead', ...edgeStyle('#f59e0b') },
];

// The default empty tree for all normal users
export const initialNodes: Node<ProgressNodeData>[] = [
  {
    id: 'user',
    position: { x: 0, y: 0 },
    data: { label: 'Me', icon: 'Crown', status: 'completed', type: 'user', color: '#ffeb3b' },
    type: 'progressNode',
  },
];

export const initialEdges: Edge[] = [];