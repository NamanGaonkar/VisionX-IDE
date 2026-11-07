const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    const graphProvider = new VisionXGraphViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('visionx.graphView', graphProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('visionx.openProjectGraph', async () => {
            try {
                await vscode.commands.executeCommand('visionx.graphView.focus');
            } catch {
                try {
                    await vscode.commands.executeCommand('workbench.view.extension.visionx-graph-panel');
                } catch {
                    openProjectGraphEditor(context);
                }
            }
        })
    );

    // Persistent 3D Graph Status Bar Item in bottom status bar
    const graphStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    graphStatusBar.text = '$(type-hierarchy) 3D Graph';
    graphStatusBar.tooltip = 'VisionX: Open 3D Project Architecture Graph in Bottom Panel';
    graphStatusBar.command = 'visionx.openProjectGraph';
    graphStatusBar.show();
    context.subscriptions.push(graphStatusBar);
}

class VisionXGraphViewProvider {
    constructor(extensionUri, context) {
        this._extensionUri = extensionUri;
        this._context = context;
    }

    resolveWebviewView(webviewView) {
        setupGraphWebview(webviewView.webview, this._extensionUri, this._context);
    }
}

function openProjectGraphEditor(context) {
    const panel = vscode.window.createWebviewPanel(
        'visionxProjectGraph',
        'VisionX Project Architecture Graph',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri]
        }
    );

    setupGraphWebview(panel.webview, context.extensionUri, context);
}

function setupGraphWebview(webview, extensionUri, context) {
    webview.options = {
        enableScripts: true,
        localResourceRoots: [extensionUri]
    };

    const htmlPath = path.join(__dirname, 'media', 'graph.html');
    try {
        let html = fs.readFileSync(htmlPath, 'utf8');
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'graph.js'));
        html = html.replace('{{GRAPH_JS_URI}}', jsUri.toString());
        webview.html = html;
    } catch (e) {
        webview.html = '<h3>Error loading Graph: ' + e.message + '</h3>';
    }

    webview.onDidReceiveMessage(async (data) => {
        switch (data.type) {
            case 'getGraphData': {
                const graph = await scanWorkspaceGraph();
                webview.postMessage({ type: 'graphData', nodes: graph.nodes, edges: graph.edges });
                break;
            }
            case 'openFile': {
                try {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        const root = workspaceFolders[0].uri.fsPath;
                        const fullPath = path.isAbsolute(data.path) ? data.path : path.join(root, data.path);
                        if (fs.existsSync(fullPath)) {
                            const doc = await vscode.workspace.openTextDocument(fullPath);
                            await vscode.window.showTextDocument(doc);
                        }
                    }
                } catch (e) {
                    vscode.window.showErrorMessage('Error opening file: ' + e.message);
                }
                break;
            }
            case 'askChat':
            case 'sendExternalPrompt':
            case 'openChat': {
                try {
                    await vscode.commands.executeCommand('claude-dev.SidebarProvider.focus');
                } catch {
                    try {
                        await vscode.commands.executeCommand('cline.focusChatInput');
                    } catch {}
                }
                break;
            }
        }
    });
}

async function scanWorkspaceGraph() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return { nodes: [], edges: [] };
    }

    const root = workspaceFolders[0].uri.fsPath;
    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.vscode', '.visionx', '__pycache__', 'venv', '.env', 'coverage', '.cache']);
    const allowedExts = new Set(['.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.md', '.sh', '.ps1', '.svg']);

    const fileList = [];

    function walkDir(dir) {
        if (fileList.length >= 400) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
                if (fileList.length >= 400) break;
                if (ent.isDirectory()) {
                    if (!ignoreDirs.has(ent.name) && !ent.name.startsWith('.')) {
                        walkDir(path.join(dir, ent.name));
                    }
                } else if (ent.isFile()) {
                    const ext = path.extname(ent.name).toLowerCase();
                    if (allowedExts.has(ext)) {
                        fileList.push(path.join(dir, ent.name));
                    }
                }
            }
        } catch {}
    }

    walkDir(root);

    const nodes = [];
    const edges = [];
    const fileIdMap = new Map();
    const fileBaseMap = new Map();

    for (const fullPath of fileList) {
        const rel = path.relative(root, fullPath).replace(/\\/g, '/');
        const ext = path.extname(fullPath).toLowerCase().replace('.', '');
        const base = path.basename(fullPath);
        const nameWithoutExt = path.basename(fullPath, path.extname(fullPath));

        let size = 0;
        try {
            size = fs.statSync(fullPath).size;
        } catch {}

        const node = {
            id: rel,
            name: base,
            path: rel,
            ext: ext,
            size: size,
            importsOut: 0,
            importsIn: 0
        };

        nodes.push(node);
        fileIdMap.set(rel, node);
        fileBaseMap.set(nameWithoutExt, rel);
        fileBaseMap.set(base, rel);
    }

    // Parse dependencies
    for (const fullPath of fileList) {
        const rel = path.relative(root, fullPath).replace(/\\/g, '/');
        const currentNode = fileIdMap.get(rel);
        if (!currentNode) continue;

        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const targetsFound = new Set();

            // JS / TS regex: import ... from '...' or require('...')
            const jsImportRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
            let match;
            while ((match = jsImportRegex.exec(content)) !== null) {
                const targetRef = match[1];
                resolveTarget(targetRef, fullPath, root, fileIdMap, fileBaseMap, targetsFound);
            }

            // Python regex: from x import y or import x
            if (fullPath.endsWith('.py')) {
                const pyImportRegex = /(?:^|\n)\s*(?:from|import)\s+([a-zA-Z0-9_\.]+)/g;
                while ((match = pyImportRegex.exec(content)) !== null) {
                    const targetRef = match[1].split('.')[0];
                    if (fileBaseMap.has(targetRef) && fileBaseMap.get(targetRef) !== rel) {
                        targetsFound.add(fileBaseMap.get(targetRef));
                    }
                }
            }

            // CSS regex: @import '...'
            if (fullPath.endsWith('.css')) {
                const cssImportRegex = /@import\s+['"]([^'"]+)['"]/g;
                while ((match = cssImportRegex.exec(content)) !== null) {
                    resolveTarget(match[1], fullPath, root, fileIdMap, fileBaseMap, targetsFound);
                }
            }

            for (const targetId of targetsFound) {
                if (targetId && targetId !== rel) {
                    edges.push({ source: rel, target: targetId });
                    currentNode.importsOut++;
                    const targetNode = fileIdMap.get(targetId);
                    if (targetNode) {
                        targetNode.importsIn++;
                    }
                }
            }
        } catch {}
    }

    // Cluster files by parent directory so 100% of nodes are connected in 3D
    const dirMap = new Map();
    for (const node of nodes) {
        const dir = path.dirname(node.path).replace(/\\/g, '/');
        if (!dirMap.has(dir)) dirMap.set(dir, []);
        dirMap.get(dir).push(node);
    }

    const existingEdgeSet = new Set(edges.map(e => `${e.source}->${e.target}`));

    for (const [dir, dirNodes] of dirMap.entries()) {
        if (dirNodes.length > 1) {
            const primary = dirNodes.find(n => n.name.startsWith('index.') || n.name.startsWith('main.') || n.name === '__init__.py') || dirNodes[0];
            for (const child of dirNodes) {
                if (child !== primary) {
                    const k1 = `${primary.id}->${child.id}`;
                    const k2 = `${child.id}->${primary.id}`;
                    if (!existingEdgeSet.has(k1) && !existingEdgeSet.has(k2)) {
                        edges.push({ source: primary.id, target: child.id, kind: 'cluster' });
                        existingEdgeSet.add(k1);
                        primary.importsOut++;
                        child.importsIn++;
                    }
                }
            }
        }
    }

    // Connect directory roots to workspace entry files
    const rootNodes = nodes.filter(n => !n.path.includes('/'));
    if (rootNodes.length > 0) {
        const mainRoot = rootNodes.find(n => n.name === 'package.json' || n.name === 'README.md') || rootNodes[0];
        for (const [dir, dirNodes] of dirMap.entries()) {
            if (dir !== '.') {
                const primary = dirNodes[0];
                const k = `${mainRoot.id}->${primary.id}`;
                if (!existingEdgeSet.has(k) && !existingEdgeSet.has(`${primary.id}->${mainRoot.id}`)) {
                    edges.push({ source: mainRoot.id, target: primary.id, kind: 'hierarchy' });
                    existingEdgeSet.add(k);
                    mainRoot.importsOut++;
                    primary.importsIn++;
                }
            }
        }
    }

    return { nodes, edges };
}

function resolveTarget(targetRef, currentFullPath, root, fileIdMap, fileBaseMap, targetsFound) {
    if (targetRef.startsWith('.')) {
        const abs = path.resolve(path.dirname(currentFullPath), targetRef);
        const relCandidate = path.relative(root, abs).replace(/\\/g, '/');

        if (fileIdMap.has(relCandidate)) {
            targetsFound.add(relCandidate);
            return;
        }
        for (const ext of ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.css']) {
            if (fileIdMap.has(relCandidate + ext)) {
                targetsFound.add(relCandidate + ext);
                return;
            }
        }
        const indexCandidate = relCandidate + '/index.js';
        if (fileIdMap.has(indexCandidate)) {
            targetsFound.add(indexCandidate);
            return;
        }
    } else {
        const base = path.basename(targetRef);
        if (fileBaseMap.has(base)) {
            targetsFound.add(fileBaseMap.get(base));
        }
    }
}

module.exports = { activate, deactivate: () => {} };
