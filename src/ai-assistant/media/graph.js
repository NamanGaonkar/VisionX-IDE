const vscode = acquireVsCodeApi();

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

const statsBadge = document.getElementById('stats-badge');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const rotateToggleBtn = document.getElementById('rotate-toggle-btn');
const fitBtn = document.getElementById('fit-btn');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const openChatBtn = document.getElementById('open-chat-btn');

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

let rawNodes = [];
let rawEdges = [];
let nodes = [];
let edges = [];
let selectedNode = null;
let hoveredNode = null;

// 3D Camera & Orientation
let rotX = 0.35;
let rotY = 0.45;
let targetRotX = 0.35;
let targetRotY = 0.45;

let zoom = 1.0;
let targetZoom = 1.0;

let camTargetX = 0;
let camTargetY = 0;
let camTargetZ = 0;
let targetCamX = 0;
let targetCamY = 0;
let targetCamZ = 0;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let autoRotate = true;
let pulseOffset = 0;

const FOV = 650; // Perspective depth field

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
  other:'#94a3b8'
};

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// Initial data request
vscode.postMessage({ type: 'getGraphData' });

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'graphData') {
    rawNodes = msg.nodes || [];
    rawEdges = msg.edges || [];
    buildGraph(rawNodes, rawEdges);
    statsBadge.textContent = nodes.length + ' 3D nodes | ' + edges.length + ' links';
  }
});

function buildGraph(inNodes, inEdges) {
  const count = inNodes.length;
  const radius = Math.max(160, Math.min(380, count * 22));

  nodes = inNodes.map((n, i) => {
    // Distribute on 3D Fibonacci sphere
    const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(1, count));
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

    const r = radius * (0.65 + 0.35 * Math.sin(i * 1.5));
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const baseRadius = Math.max(7, Math.min(16, 6 + (n.size ? Math.log10(n.size + 10) * 2.5 : 2)));
    return {
      ...n,
      x, y, z,
      baseRadius,
      color: TYPE_COLORS[n.ext] || TYPE_COLORS.other,
      // Projected values (calculated per frame)
      projX: 0,
      projY: 0,
      projRadius: baseRadius,
      projZ: 0,
      visible: true
    };
  });

  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));

  edges = [];
  inEdges.forEach(e => {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    if (s && t) {
      edges.push({
        source: s,
        target: t,
        kind: e.kind || 'import'
      });
    }
  });

  resetCamera();
}

function resetCamera() {
  selectedNode = null;
  targetCamX = 0;
  targetCamY = 0;
  targetCamZ = 0;
  targetZoom = 1.0;
  targetRotX = 0.35;
  targetRotY = 0.45;
  autoRotate = true;
  rotateToggleBtn.classList.add('active');
  nodeInspector.style.display = 'none';
}

function zoomToNode(node) {
  selectedNode = node;
  autoRotate = false;
  rotateToggleBtn.classList.remove('active');

  targetCamX = node.x;
  targetCamY = node.y;
  targetCamZ = node.z;
  targetZoom = 1.85;

  showInspector(node);
}

function showInspector(node) {
  inspectorName.textContent = node.name;
  inspectorPath.textContent = node.path;
  inspectorType.textContent = (node.ext || 'file').toUpperCase();
  inspectorSize.textContent = (node.size ? (node.size / 1024).toFixed(1) + ' KB' : '< 1 KB');
  inspectorImportsOut.textContent = node.importsOut + ' references';
  inspectorImportsIn.textContent = node.importsIn + ' dependents';
  nodeInspector.style.display = 'flex';
}

inspectorClose.onclick = () => {
  resetCamera();
};

askChatBtn.onclick = () => {
  if (selectedNode) {
    vscode.postMessage({
      type: 'sendExternalPrompt',
      prompt: 'Explain the architecture and purpose of file `' + selectedNode.path + '` in this codebase.'
    });
  }
};

openFileBtn.onclick = () => {
  if (selectedNode) {
    vscode.postMessage({
      type: 'openFile',
      path: selectedNode.path
    });
  }
};

if (openChatBtn) {
  openChatBtn.onclick = () => {
    vscode.postMessage({ type: 'openChat' });
  };
}

rotateToggleBtn.onclick = () => {
  autoRotate = !autoRotate;
  if (autoRotate) {
    rotateToggleBtn.classList.add('active');
  } else {
    rotateToggleBtn.classList.remove('active');
  }
};

fitBtn.onclick = resetCamera;
zoomResetBtn.onclick = resetCamera;
zoomInBtn.onclick = () => { targetZoom = Math.min(3.5, targetZoom * 1.3); };
zoomOutBtn.onclick = () => { targetZoom = Math.max(0.4, targetZoom * 0.75); };

// Mouse Interaction: 3D Drag Rotation & Click
container.addEventListener('mousedown', (e) => {
  if (e.target !== canvas) return;
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    targetRotY += dx * 0.007;
    targetRotX -= dy * 0.007;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else {
    // Hover detection in 3D
    checkHover(e.clientX, e.clientY);
  }
});

// Scroll to Zoom in 3D
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
  targetZoom = Math.max(0.3, Math.min(3.8, targetZoom * zoomFactor));
}, { passive: false });

// Click to focus node or reset
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  let clicked = null;
  let minD = 9999;

  // Search from front to back
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.visible) continue;
    const dist = Math.hypot(n.projX - mx, n.projY - my);
    if (dist <= n.projRadius + 6 && dist < minD) {
      clicked = n;
      minD = dist;
    }
  }

  if (clicked) {
    zoomToNode(clicked);
  } else {
    resetCamera();
  }
});

function checkHover(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;

  let found = null;
  let minD = 9999;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.visible) continue;
    const dist = Math.hypot(n.projX - mx, n.projY - my);
    if (dist <= n.projRadius + 4 && dist < minD) {
      found = n;
      minD = dist;
    }
  }
  hoveredNode = found;
  canvas.style.cursor = found ? 'pointer' : 'grab';
}

// Search and filter
searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase().trim();
  applyFilters(term, filterType.value);
});

filterType.addEventListener('change', () => {
  applyFilters(searchInput.value.toLowerCase().trim(), filterType.value);
});

function applyFilters(term, type) {
  nodes.forEach(n => {
    let matchTerm = !term || n.name.toLowerCase().includes(term) || n.path.toLowerCase().includes(term);
    let matchType = true;
    if (type === 'py') matchType = (n.ext === 'py');
    else if (type === 'js') matchType = ['js', 'ts', 'jsx', 'tsx'].includes(n.ext);
    else if (type === 'web') matchType = ['html', 'css', 'svg'].includes(n.ext);
    else if (type === 'config') matchType = ['json', 'md', 'sh', 'ps1'].includes(n.ext);

    n.visible = matchTerm && matchType;
  });
}

// 3D Rendering & Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Smooth interpolation for rotation & camera
  if (autoRotate && !isDragging) {
    targetRotY += 0.0035;
  }
  rotX += (targetRotX - rotX) * 0.08;
  rotY += (targetRotY - rotY) * 0.08;
  zoom += (targetZoom - zoom) * 0.08;

  camTargetX += (targetCamX - camTargetX) * 0.08;
  camTargetY += (targetCamY - camTargetY) * 0.08;
  camTargetZ += (targetCamZ - camTargetZ) * 0.08;

  pulseOffset = (pulseOffset + 0.015) % 1;

  render3D();
}
requestAnimationFrame(animate);

function project3D(x, y, z, cx, cy) {
  // Translate relative to camera target
  const tx = (x - camTargetX) * zoom;
  const ty = (y - camTargetY) * zoom;
  const tz = (z - camTargetZ) * zoom;

  // Rotate around Y
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = tx * cosY + tz * sinY;
  const z1 = -tx * sinY + tz * cosY;

  // Rotate around X
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = ty * cosX - z1 * sinX;
  const z2 = ty * sinX + z1 * cosX;

  const depth = z2 + FOV;
  if (depth <= 10) return null; // Behind camera

  const scale = FOV / depth;
  return {
    px: cx + x1 * scale,
    py: cy + y2 * scale,
    scale: scale,
    depth: z2
  };
}

function render3D() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Background subtle cosmic grid / rings
  drawBackgroundAmbience(cx, cy);

  // Project all visible nodes
  const projectedNodes = [];
  nodes.forEach(n => {
    if (!n.visible) return;
    const proj = project3D(n.x, n.y, n.z, cx, cy);
    if (proj) {
      n.projX = proj.px;
      n.projY = proj.py;
      n.projRadius = Math.max(3, n.baseRadius * proj.scale * zoom);
      n.projZ = proj.depth;
      projectedNodes.push(n);
    }
  });

  // Sort back-to-front by 3D depth for true depth rendering
  projectedNodes.sort((a, b) => b.projZ - a.projZ);

  // Draw 3D Edges
  edges.forEach(e => {
    if (!e.source.visible || !e.target.visible) return;

    const p1 = project3D(e.source.x, e.source.y, e.source.z, cx, cy);
    const p2 = project3D(e.target.x, e.target.y, e.target.z, cx, cy);
    if (!p1 || !p2) return;

    const isConnectedToSelected = selectedNode && (e.source === selectedNode || e.target === selectedNode);
    const isConnectedToHovered = hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);

    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);

    if (isConnectedToSelected) {
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 10;
    } else if (isConnectedToHovered) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 0;
    } else {
      const alpha = Math.max(0.08, Math.min(0.35, (p1.scale + p2.scale) * 0.15));
      ctx.strokeStyle = `rgba(255, 120, 50, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Animated traveling pulse particles along active links
    if (isConnectedToSelected || isConnectedToHovered) {
      const pulseX = p1.px + (p2.px - p1.px) * pulseOffset;
      const pulseY = p1.py + (p2.py - p1.py) * pulseOffset;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Draw 3D Nodes as glowing spheres
  projectedNodes.forEach(n => {
    const isSelected = (n === selectedNode);
    const isHovered = (n === hoveredNode);

    // Node outer glow / aura
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(n.projX, n.projY, n.projRadius + (isSelected ? 7 : 4), 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? '#ff5500' : '#ffaa00';
      ctx.lineWidth = 2;
      ctx.shadowColor = isSelected ? '#ff5500' : '#ffaa00';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Sphere fill with 3D radial gradient
    const grad = ctx.createRadialGradient(
      n.projX - n.projRadius * 0.35,
      n.projY - n.projRadius * 0.35,
      n.projRadius * 0.1,
      n.projX,
      n.projY,
      n.projRadius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, n.color);
    grad.addColorStop(1, '#05070d');

    ctx.beginPath();
    ctx.arc(n.projX, n.projY, n.projRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Node label (visible on hover, select, or when camera is close)
    if (isSelected || isHovered || n.projRadius > 8) {
      ctx.font = (isSelected ? 'bold 11px' : '10px') + ' -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#ffaa00' : (isHovered ? '#ffffff' : '#cbd5e1');
      ctx.fillText(n.name, n.projX, n.projY + n.projRadius + 12);
    }
  });
}

function drawBackgroundAmbience(cx, cy) {
  // Ambient radial glow in center
  const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 450);
  bgGrad.addColorStop(0, 'rgba(255, 85, 0, 0.05)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
