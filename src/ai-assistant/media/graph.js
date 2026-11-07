const vscode = acquireVsCodeApi();

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

const statsBadge = document.getElementById('stats-badge');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const refreshBtn = document.getElementById('refresh-btn');
const fitBtn = document.getElementById('fit-btn');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');

const nodeInspector = document.getElementById('node-inspector');
const inspectorName = document.getElementById('inspector-name');
const inspectorPath = document.getElementById('inspector-path');
const inspectorType = document.getElementById('inspector-type');
const inspectorSize = document.getElementById('inspector-size');
const inspectorImportsOut = document.getElementById('inspector-imports-out');
const inspectorImportsIn = document.getElementById('inspector-imports-in');
const inspectorClose = document.getElementById('inspector-close');
const askChatBtn = document.getElementById('ask-chat-btn');
const openFileBtn = document.getElementById('open-file-btn');

let nodes = [];
let edges = [];
let selectedNode = null;
let hoveredNode = null;

// Camera Transform
let panX = 0;
let panY = 0;
let zoom = 1;
let isPanning = false;
let startX = 0;
let startY = 0;
let draggedNode = null;

// Color mapping by extension
const TYPE_COLORS = {
  py:   '#3572A5',
  js:   '#f1e05a',
  ts:   '#3178c6',
  jsx:  '#61dafb',
  tsx:  '#3178c6',
  json: '#ff8800',
  css:  '#c6538c',
  html: '#e34c26',
  md:   '#0885d7',
  svg:  '#ff9900',
  sh:   '#89e051',
  ps1:  '#012456',
  other:'#8b949e'
};

function resize() {
  canvas.width = container.clientWidth * window.devicePixelRatio;
  canvas.height = container.clientHeight * window.devicePixelRatio;
  draw();
}
window.addEventListener('resize', resize);

// Request initial data from extension
vscode.postMessage({ type: 'getGraphData' });

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'graphData') {
    nodes = msg.nodes || [];
    edges = msg.edges || [];
    initSimulation();
    statsBadge.textContent = nodes.length + ' files | ' + edges.length + ' links';
    fitToScreen();
  }
});

function initSimulation() {
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  // Initial circular/spiral placement
  const count = nodes.length;
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const radius = 120 + Math.sqrt(i) * 35;
    n.x = width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40;
    n.y = height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40;
    n.vx = 0;
    n.vy = 0;
    n.radius = Math.max(10, Math.min(24, 8 + (n.size ? Math.log10(n.size + 10) * 4 : 4)));
    n.color = TYPE_COLORS[n.ext] || TYPE_COLORS.other;
  });

  // Map edges to actual node references
  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));
  edges.forEach(e => {
    e.sourceNode = nodeMap.get(e.source);
    e.targetNode = nodeMap.get(e.target);
  });

  runSimulationSteps(120);
}

function runSimulationSteps(steps) {
  for (let s = 0; s < steps; s++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 300) {
          const force = (300 - dist) / dist * 0.04;
          a.vx -= dx * force;
          a.vy -= dy * force;
          b.vx += dx * force;
          b.vy += dy * force;
        }
      }
    }

    // Spring attraction along edges
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (e.sourceNode && e.targetNode) {
        const dx = e.targetNode.x - e.sourceNode.x;
        const dy = e.targetNode.y - e.sourceNode.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = (dist - 100) * 0.015;
        e.sourceNode.vx += dx / dist * force;
        e.sourceNode.vy += dy / dist * force;
        e.targetNode.vx -= dx / dist * force;
        e.targetNode.vy -= dy / dist * force;
      }
    }

    // Apply damping
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx * 0.6;
      n.y += n.vy * 0.6;
      n.vx *= 0.85;
      n.vy *= 0.85;
    }
  }
  draw();
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  const query = searchInput.value.trim().toLowerCase();
  const fType = filterType.value;

  // Draw Edges
  edges.forEach(e => {
    if (!e.sourceNode || !e.targetNode) return;

    const isConnectedToHover = hoveredNode && (e.sourceNode === hoveredNode || e.targetNode === hoveredNode);
    const isConnectedToSelect = selectedNode && (e.sourceNode === selectedNode || e.targetNode === selectedNode);

    ctx.beginPath();
    ctx.moveTo(e.sourceNode.x, e.sourceNode.y);
    ctx.lineTo(e.targetNode.x, e.targetNode.y);

    if (isConnectedToSelect) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2.5;
    } else if (isConnectedToHover) {
      ctx.strokeStyle = 'rgba(255, 85, 0, 0.8)';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(120, 140, 180, 0.18)';
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    // Arrow indicator
    if (isConnectedToSelect || isConnectedToHover || zoom > 0.8) {
      const angle = Math.atan2(e.targetNode.y - e.sourceNode.y, e.targetNode.x - e.sourceNode.x);
      const arrowDist = e.targetNode.radius + 6;
      const ax = e.targetNode.x - Math.cos(angle) * arrowDist;
      const ay = e.targetNode.y - Math.sin(angle) * arrowDist;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - Math.cos(angle - 0.4) * 8, ay - Math.sin(angle - 0.4) * 8);
      ctx.lineTo(ax - Math.cos(angle + 0.4) * 8, ay - Math.sin(angle + 0.4) * 8);
      ctx.closePath();
      ctx.fillStyle = isConnectedToSelect ? '#ffaa00' : (isConnectedToHover ? '#ff5500' : 'rgba(120, 140, 180, 0.4)');
      ctx.fill();
    }
  });

  // Draw Nodes
  nodes.forEach(n => {
    const matchesSearch = !query || n.name.toLowerCase().includes(query) || n.path.toLowerCase().includes(query);
    const matchesFilter = fType === 'all' || n.ext === fType;
    const isSelected = selectedNode === n;
    const isHovered = hoveredNode === n;

    const opacity = (matchesSearch && matchesFilter) ? 1 : 0.15;
    ctx.globalAlpha = opacity;

    // Glowing Halo for selected or hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(255, 170, 0, 0.35)' : 'rgba(255, 85, 0, 0.25)';
      ctx.fill();
    }

    // Node Body
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#ffaa00' : (isHovered ? '#ffffff' : 'rgba(0, 0, 0, 0.4)');
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();

    // Node Label
    if (zoom > 0.45 || isSelected || isHovered || (query && matchesSearch)) {
      ctx.font = isSelected ? 'bold 11px Segoe UI, sans-serif' : '10px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#ffffff' : (isHovered ? '#ffaa00' : 'rgba(226, 232, 240, 0.85)');
      ctx.fillText(n.name, n.x, n.y + n.radius + 12);
    }

    ctx.globalAlpha = 1;
  });

  ctx.restore();
}

function getNodeAt(x, y) {
  // Translate screen coords to world coords
  const wx = (x - panX) / zoom;
  const wy = (y - panY) / zoom;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dist = Math.hypot(wx - n.x, wy - n.y);
    if (dist <= n.radius + 4) {
      return n;
    }
  }
  return null;
}

// Mouse Controls
container.addEventListener('mousedown', e => {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const node = getNodeAt(x, y);
  if (node) {
    draggedNode = node;
    selectNode(node);
  } else {
    isPanning = true;
    startX = x - panX;
    startY = y - panY;
    container.classList.add('panning');
  }
});

window.addEventListener('mousemove', e => {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (draggedNode) {
    draggedNode.x = (x - panX) / zoom;
    draggedNode.y = (y - panY) / zoom;
    draw();
  } else if (isPanning) {
    panX = x - startX;
    panY = y - startY;
    draw();
  } else {
    const node = getNodeAt(x, y);
    if (node !== hoveredNode) {
      hoveredNode = node;
      container.style.cursor = node ? 'pointer' : 'grab';
      draw();
    }
  }
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  draggedNode = null;
  container.classList.remove('panning');
});

container.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newZoom = Math.max(0.2, Math.min(4.0, zoom * zoomFactor));

  // Zoom towards cursor
  panX = mouseX - (mouseX - panX) * (newZoom / zoom);
  panY = mouseY - (mouseY - panY) * (newZoom / zoom);
  zoom = newZoom;

  draw();
});

function selectNode(node) {
  selectedNode = node;
  if (!node) {
    nodeInspector.style.display = 'none';
    draw();
    return;
  }

  // Calculate dependency stats
  const outCount = edges.filter(e => e.source === node.id).length;
  const inCount = edges.filter(e => e.target === node.id).length;

  inspectorName.textContent = node.name;
  inspectorPath.textContent = node.path || node.name;
  inspectorType.textContent = (node.ext || 'file').toUpperCase();
  inspectorSize.textContent = node.size ? Math.round(node.size / 1024) + ' KB' : 'Unknown';
  inspectorImportsOut.textContent = outCount + ' files';
  inspectorImportsIn.textContent = inCount + ' files';

  nodeInspector.style.display = 'flex';
  draw();
}

function fitToScreen() {
  if (nodes.length === 0) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x - n.radius);
    maxX = Math.max(maxX, n.x + n.radius);
    minY = Math.min(minY, n.y - n.radius);
    maxY = Math.max(maxY, n.y + n.radius);
  });

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  const graphWidth = maxX - minX + 100;
  const graphHeight = maxY - minY + 100;

  zoom = Math.min(width / graphWidth, height / graphHeight, 1.2);
  panX = (width - (maxX + minX) * zoom) / 2;
  panY = (height - (maxY + minY) * zoom) / 2;

  draw();
}

// Action button handlers
inspectorClose.onclick = () => selectNode(null);

openFileBtn.onclick = () => {
  if (selectedNode) {
    vscode.postMessage({ type: 'openFile', path: selectedNode.path });
  }
};

askChatBtn.onclick = () => {
  if (selectedNode) {
    const prompt = 'Analyze the architecture, dependencies, and role of `' + selectedNode.name + '` (' + selectedNode.path + ') in this project. What does it import, who uses it, and how does it fit into the overall codebase?';
    vscode.postMessage({ type: 'askChat', prompt: prompt, file: selectedNode.path });
  }
};

searchInput.oninput = draw;
filterType.onchange = draw;
refreshBtn.onclick = () => vscode.postMessage({ type: 'getGraphData' });
fitBtn.onclick = fitToScreen;

zoomInBtn.onclick = () => {
  zoom = Math.min(4.0, zoom * 1.25);
  draw();
};
zoomOutBtn.onclick = () => {
  zoom = Math.max(0.2, zoom * 0.8);
  draw();
};
zoomResetBtn.onclick = () => {
  zoom = 1;
  panX = 0;
  panY = 0;
  fitToScreen();
};

// Initial resize
setTimeout(resize, 50);
