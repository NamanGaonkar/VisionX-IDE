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

// True 3D Orbital Camera (Continuous 360 Rotation without Gimbal Lock)
let yaw = 0.5;          // Horizontal angle (continuous -Infinity to +Infinity)
let targetYaw = 0.5;
let pitch = 0.25;       // Vertical angle (clamped -1.45 to +1.45 rad)
let targetPitch = 0.25;

let zoom = 1.0;
let targetZoom = 1.0;
const BASE_DISTANCE = 560;
const FOV = 600;

// Focus target in 3D
let targetX = 0;
let targetY = 0;
let targetZ = 0;
let currentTargetX = 0;
let currentTargetY = 0;
let currentTargetZ = 0;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let autoRotate = true;
let pulseOffset = 0;

const TYPE_COLORS = {
  py:   '#38bdf8',
  js:   '#facc15',
  ts:   '#60a5fa',
  jsx:  '#38bdf8',
  tsx:  '#60a5fa',
  json: '#fb923c',
  css:  '#f472b6',
  html: '#fb7185',
  md:   '#a78bfa',
  svg:  '#f59e0b',
  sh:   '#4ade80',
  ps1:  '#818cf8',
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

vscode.postMessage({ type: 'getGraphData' });

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'graphData') {
    rawNodes = msg.nodes || [];
    rawEdges = msg.edges || [];
    buildGraph(rawNodes, rawEdges);
    if (statsBadge) {
      statsBadge.textContent = nodes.length + ' 3D nodes | ' + edges.length + ' links';
    }
  }
});

function buildGraph(inNodes, inEdges) {
  const count = inNodes.length;
  const radius = Math.max(140, Math.min(260, count * 15));

  nodes = inNodes.map((n, i) => {
    // Distribute on 3D Fibonacci sphere
    const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(1, count));
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

    const r = radius * (0.7 + 0.3 * Math.sin(i * 1.3));
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const baseRadius = Math.max(6, Math.min(13, 5 + (n.size ? Math.log10(n.size + 10) * 2 : 2)));
    return {
      ...n,
      x, y, z,
      baseRadius,
      color: TYPE_COLORS[n.ext] || TYPE_COLORS.other,
      screenX: 0,
      screenY: 0,
      screenRadius: baseRadius,
      depth: 0,
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
  targetX = 0;
  targetY = 0;
  targetZ = 0;
  targetZoom = 1.0;
  targetPitch = 0.25;
  autoRotate = true;
  if (rotateToggleBtn) rotateToggleBtn.classList.add('active');
  if (nodeInspector) nodeInspector.style.display = 'none';
}

function zoomToNode(node) {
  selectedNode = node;
  autoRotate = false;
  if (rotateToggleBtn) rotateToggleBtn.classList.remove('active');

  targetX = node.x;
  targetY = node.y;
  targetZ = node.z;
  targetZoom = 1.9;

  showInspector(node);
}

function showInspector(node) {
  if (!nodeInspector) return;
  inspectorName.textContent = node.name;
  inspectorPath.textContent = node.path;
  inspectorType.textContent = (node.ext || 'file').toUpperCase();
  inspectorSize.textContent = (node.size ? (node.size / 1024).toFixed(1) + ' KB' : '< 1 KB');
  inspectorImportsOut.textContent = node.importsOut + ' references';
  inspectorImportsIn.textContent = node.importsIn + ' dependents';
  nodeInspector.style.display = 'flex';
}

if (inspectorClose) inspectorClose.onclick = resetCamera;
if (askChatBtn) {
  askChatBtn.onclick = () => {
    if (selectedNode) {
      vscode.postMessage({
        type: 'sendExternalPrompt',
        prompt: 'Explain the architecture and purpose of file `' + selectedNode.path + '` in this codebase.'
      });
    }
  };
}

if (openFileBtn) {
  openFileBtn.onclick = () => {
    if (selectedNode) {
      vscode.postMessage({
        type: 'openFile',
        path: selectedNode.path
      });
    }
  };
}

if (openChatBtn) {
  openChatBtn.onclick = () => {
    vscode.postMessage({ type: 'openChat' });
  };
}

if (rotateToggleBtn) {
  rotateToggleBtn.onclick = () => {
    autoRotate = !autoRotate;
    rotateToggleBtn.classList.toggle('active', autoRotate);
  };
}

if (fitBtn) fitBtn.onclick = resetCamera;
if (zoomResetBtn) zoomResetBtn.onclick = resetCamera;
if (zoomInBtn) zoomInBtn.onclick = () => { targetZoom = Math.min(3.2, targetZoom * 1.25); };
if (zoomOutBtn) zoomOutBtn.onclick = () => { targetZoom = Math.max(0.4, targetZoom * 0.8); };

// Drag Interaction: Full 360 Spherical Rotation
container.addEventListener('mousedown', (e) => {
  if (e.target !== canvas) return;
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    targetYaw += dx * 0.007;
    targetPitch = Math.max(-1.42, Math.min(1.42, targetPitch + dy * 0.007));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else {
    checkHover(e.clientX, e.clientY);
  }
});

// Scroll to Zoom in 3D
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  targetZoom = Math.max(0.4, Math.min(3.2, targetZoom * factor));
}, { passive: false });

// Click to focus node or reset
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  let clicked = null;
  let minD = 9999;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.visible) continue;
    const dist = Math.hypot(n.screenX - mx, n.screenY - my);
    if (dist <= n.screenRadius + 6 && dist < minD) {
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
    const dist = Math.hypot(n.screenX - mx, n.screenY - my);
    if (dist <= n.screenRadius + 4 && dist < minD) {
      found = n;
      minD = dist;
    }
  }
  hoveredNode = found;
  canvas.style.cursor = found ? 'pointer' : 'grab';
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    applyFilters(searchInput.value.toLowerCase().trim(), filterType ? filterType.value : 'all');
  });
}

if (filterType) {
  filterType.addEventListener('change', () => {
    applyFilters(searchInput ? searchInput.value.toLowerCase().trim() : '', filterType.value);
  });
}

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

// 3D Orbital Projection Function
function project3D(wx, wy, wz, cx, cy, distance) {
  // Camera Position in spherical coords around focus target
  const camX = distance * Math.cos(pitch) * Math.sin(yaw) + currentTargetX;
  const camY = distance * Math.sin(pitch) + currentTargetY;
  const camZ = distance * Math.cos(pitch) * Math.cos(yaw) + currentTargetZ;

  // Forward unit vector from camera toward focus target
  const fx = currentTargetX - camX;
  const fy = currentTargetY - camY;
  const fz = currentTargetZ - camZ;
  const flen = Math.hypot(fx, fy, fz) || 1;
  const nfx = fx / flen;
  const nfy = fy / flen;
  const nfz = fz / flen;

  // Right unit vector = cross(forward, world_up=(0,1,0))
  let rx = nfz;
  let rz = -nfx;
  const rlen = Math.hypot(rx, rz) || 1;
  rx /= rlen;
  rz /= rlen;

  // Up unit vector = cross(right, forward)
  const ux = -rz * nfy;
  const uy = rz * nfx - rx * nfz;
  const uz = rx * nfy;

  // Vector from camera to world point
  const dx = wx - camX;
  const dy = wy - camY;
  const dz = wz - camZ;

  // View-space coordinates
  const vx = dx * rx + dz * rz;
  const vy = dx * ux + dy * uy + dz * uz;
  const vz = dx * nfx + dy * nfy + dz * nfz;

  if (vz <= 15) return null; // Behind camera plane

  const scale = FOV / vz;
  return {
    px: cx + vx * scale,
    py: cy - vy * scale,
    scale: scale,
    depth: vz
  };
}

// Main 3D Render Loop
function animate() {
  requestAnimationFrame(animate);

  // Smooth continuous ambient rotation
  if (autoRotate && !isDragging) {
    targetYaw += 0.003;
  }

  yaw += (targetYaw - yaw) * 0.09;
  pitch += (targetPitch - pitch) * 0.09;
  zoom += (targetZoom - zoom) * 0.09;

  currentTargetX += (targetX - currentTargetX) * 0.09;
  currentTargetY += (targetY - currentTargetY) * 0.09;
  currentTargetZ += (targetZ - currentTargetZ) * 0.09;

  pulseOffset = (pulseOffset + 0.018) % 1;

  render3D();
}
requestAnimationFrame(animate);

function render3D() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const distance = BASE_DISTANCE / zoom;

  ctx.clearRect(0, 0, w, h);

  // Background subtle dark radial ambience
  const bgGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(w, h) * 0.7);
  bgGrad.addColorStop(0, 'rgba(255, 85, 0, 0.04)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Project all visible nodes
  const projectedNodes = [];
  nodes.forEach(n => {
    if (!n.visible) return;
    const proj = project3D(n.x, n.y, n.z, cx, cy, distance);
    if (proj) {
      n.screenX = proj.px;
      n.screenY = proj.py;
      n.screenRadius = Math.max(3, n.baseRadius * proj.scale);
      n.depth = proj.depth;
      projectedNodes.push(n);
    }
  });

  // True depth sorting (back to front)
  projectedNodes.sort((a, b) => b.depth - a.depth);

  // Draw 3D Edges
  edges.forEach(e => {
    if (!e.source.visible || !e.target.visible) return;

    const p1 = project3D(e.source.x, e.source.y, e.source.z, cx, cy, distance);
    const p2 = project3D(e.target.x, e.target.y, e.target.z, cx, cy, distance);
    if (!p1 || !p2) return;

    const isConnectedToSelected = selectedNode && (e.source === selectedNode || e.target === selectedNode);
    const isConnectedToHovered = hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);

    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);

    if (isConnectedToSelected) {
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur = 8;
    } else if (isConnectedToHovered) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255, 120, 50, 0.16)';
      ctx.lineWidth = 0.9;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving signal pulse along connected edges
    if (isConnectedToSelected || isConnectedToHovered) {
      const pulseX = p1.px + (p2.px - p1.px) * pulseOffset;
      const pulseY = p1.py + (p2.py - p1.py) * pulseOffset;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Draw 3D Nodes
  projectedNodes.forEach(n => {
    const isSelected = (n === selectedNode);
    const isHovered = (n === hoveredNode);

    // Glowing halo on select/hover
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(n.screenX, n.screenY, n.screenRadius + (isSelected ? 6 : 3.5), 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? '#ff5500' : '#ffaa00';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = isSelected ? '#ff5500' : '#ffaa00';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 3D Sphere Shading
    const grad = ctx.createRadialGradient(
      n.screenX - n.screenRadius * 0.35,
      n.screenY - n.screenRadius * 0.35,
      n.screenRadius * 0.08,
      n.screenX,
      n.screenY,
      n.screenRadius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, n.color);
    grad.addColorStop(1, '#060810');

    ctx.beginPath();
    ctx.arc(n.screenX, n.screenY, n.screenRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Node Name Tag
    if (isSelected || isHovered || n.screenRadius > 8) {
      ctx.font = (isSelected ? '600 11px' : '10px') + ' -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#ffaa00' : (isHovered ? '#ffffff' : '#94a3b8');
      ctx.fillText(n.name, n.screenX, n.screenY + n.screenRadius + 11);
    }
  });
}
