const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let globalAIProvider = null;

function activate(context) {
    const aiProvider = new VisionXAIViewProvider(context.extensionUri, context);
    globalAIProvider = aiProvider;

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('visionx.aiView', aiProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    const graphProvider = new VisionXGraphViewProvider(context.extensionUri, context, aiProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('visionx.graphView', graphProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('visionx.askAI', () => {
            vscode.commands.executeCommand('visionx.aiView.focus');
        }),
        vscode.commands.registerCommand('visionx.openProjectGraph', async () => {
            try {
                await vscode.commands.executeCommand('visionx.graphView.focus');
            } catch {
                try {
                    await vscode.commands.executeCommand('workbench.view.extension.visionx-graph-panel');
                } catch {
                    openProjectGraphEditor(context, aiProvider);
                }
            }
        }),
        vscode.commands.registerCommand('visionx.explainCode', () => {
            triggerCodeAction(aiProvider, '/explain');
        }),
        vscode.commands.registerCommand('visionx.refactorCode', () => {
            triggerCodeAction(aiProvider, '/refactor');
        }),
        vscode.commands.registerCommand('visionx.fixErrors', () => {
            triggerCodeAction(aiProvider, '/fix');
        }),
        vscode.commands.registerCommand('visionx.importFromVSCode', () => {
            importFromVSCode(true);
        })
    );

    // Persistent 3D Graph Status Bar Item in bottom status bar
    const graphStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    graphStatusBar.text = '$(type-hierarchy) 3D Graph';
    graphStatusBar.tooltip = 'VisionX: Open 3D Project Architecture Graph in Bottom Panel';
    graphStatusBar.command = 'visionx.openProjectGraph';
    graphStatusBar.show();
    context.subscriptions.push(graphStatusBar);

    // Automatic seamless startup synchronization from VS Code
    autoSyncFromVSCode();
}

function autoSyncFromVSCode() {
    try {
        const appData = process.env.APPDATA || '';
        const userProfile = process.env.USERPROFILE || '';
        const vscodeUserData = path.join(appData, 'Code', 'User');
        const targetUserDirs = [
            path.join(appData, 'VisionX', 'User'),
            path.join(appData, '.visionx', 'User'),
            path.join(userProfile, '.visionx', 'User'),
            path.join(userProfile, 'VisionX', 'User')
        ];

        if (fs.existsSync(vscodeUserData)) {
            for (const targetUser of targetUserDirs) {
                try {
                    fs.mkdirSync(targetUser, { recursive: true });
                    for (const fname of ['settings.json', 'keybindings.json', 'mcp.json', 'chatLanguageModels.json', 'tasks.json']) {
                        const src = path.join(vscodeUserData, fname);
                        const dest = path.join(targetUser, fname);
                        if (fs.existsSync(src) && !fs.existsSync(dest)) {
                            fs.copyFileSync(src, dest);
                        }
                    }
                    const snipSrc = path.join(vscodeUserData, 'snippets');
                    const snipDest = path.join(targetUser, 'snippets');
                    if (fs.existsSync(snipSrc) && !fs.existsSync(snipDest)) {
                        fs.cpSync(snipSrc, snipDest, { recursive: true });
                    }
                } catch {}
            }
        }

        // Link extensions to all target directories
        const vscodeExt = path.join(userProfile, '.vscode', 'extensions');
        const targetExtDirs = [
            path.join(userProfile, '.visionx', 'extensions'),
            path.join(userProfile, 'VisionX', 'extensions'),
            path.join(appData, 'VisionX', 'extensions')
        ];

        if (fs.existsSync(vscodeExt)) {
            for (const targetExt of targetExtDirs) {
                try {
                    fs.mkdirSync(targetExt, { recursive: true });
                    const extJsonSrc = path.join(vscodeExt, 'extensions.json');
                    const extJsonDest = path.join(targetExt, 'extensions.json');
                    if (fs.existsSync(extJsonSrc) && !fs.existsSync(extJsonDest)) {
                        try { fs.copyFileSync(extJsonSrc, extJsonDest); } catch {}
                    }
                    const entries = fs.readdirSync(vscodeExt);
                    for (const item of entries) {
                        if (!item.startsWith('.')) {
                            const srcItem = path.join(vscodeExt, item);
                            const destItem = path.join(targetExt, item);
                            if (!fs.existsSync(destItem)) {
                                try {
                                    fs.symlinkSync(srcItem, destItem, 'junction');
                                } catch {
                                    try { fs.cpSync(srcItem, destItem, { recursive: true }); } catch {}
                                }
                            }
                        }
                    }
                } catch {}
            }
        }
    } catch {}
}

async function importFromVSCode(interactive) {
    try {
        const vscodeUserData = path.join(process.env.APPDATA || '', 'Code', 'User');
        const visionxUserData = path.join(process.env.APPDATA || '', 'VisionX', 'User');

        if (!fs.existsSync(vscodeUserData)) {
            if (interactive) {
                vscode.window.showWarningMessage('No existing Visual Studio Code user configuration found to import.');
            }
            return;
        }

        fs.mkdirSync(visionxUserData, { recursive: true });

        // Copy settings.json
        const settingsSrc = path.join(vscodeUserData, 'settings.json');
        const settingsDest = path.join(visionxUserData, 'settings.json');
        if (fs.existsSync(settingsSrc)) {
            fs.copyFileSync(settingsSrc, settingsDest);
        }

        // Copy keybindings.json
        const keybindingsSrc = path.join(vscodeUserData, 'keybindings.json');
        const keybindingsDest = path.join(visionxUserData, 'keybindings.json');
        if (fs.existsSync(keybindingsSrc)) {
            fs.copyFileSync(keybindingsSrc, keybindingsDest);
        }

        // Copy snippets directory
        const snippetsSrc = path.join(vscodeUserData, 'snippets');
        const snippetsDest = path.join(visionxUserData, 'snippets');
        if (fs.existsSync(snippetsSrc)) {
            fs.cpSync(snippetsSrc, snippetsDest, { recursive: true });
        }

        // Copy mcp.json
        const mcpSrc = path.join(vscodeUserData, 'mcp.json');
        const mcpDest = path.join(visionxUserData, 'mcp.json');
        if (fs.existsSync(mcpSrc)) {
            fs.copyFileSync(mcpSrc, mcpDest);
        }

        // Copy/link all extensions from .vscode/extensions
        const userProfile = process.env.USERPROFILE || '';
        const vscodeExt = path.join(userProfile, '.vscode', 'extensions');
        const targetExts = [
            path.join(userProfile, '.visionx', 'extensions'),
            path.join(userProfile, 'VisionX', 'extensions'),
            path.join(process.env.APPDATA || '', 'VisionX', 'extensions')
        ];
        let extCount = 0;
        if (fs.existsSync(vscodeExt)) {
            for (const tExt of targetExts) {
                fs.mkdirSync(tExt, { recursive: true });
                const extJsonSrc = path.join(vscodeExt, 'extensions.json');
                const extJsonDest = path.join(tExt, 'extensions.json');
                if (fs.existsSync(extJsonSrc)) {
                    try { fs.copyFileSync(extJsonSrc, extJsonDest); } catch {}
                }
                const entries = fs.readdirSync(vscodeExt);
                for (const item of entries) {
                    if (!item.startsWith('.')) {
                        const srcItem = path.join(vscodeExt, item);
                        const destItem = path.join(tExt, item);
                        if (!fs.existsSync(destItem)) {
                            try {
                                fs.symlinkSync(srcItem, destItem, 'junction');
                                extCount++;
                            } catch {
                                try {
                                    fs.cpSync(srcItem, destItem, { recursive: true });
                                    extCount++;
                                } catch {}
                            }
                        }
                    }
                }
            }
        }

        const msg = extCount > 0
            ? 'Successfully imported settings, keybindings, snippets, and ' + extCount + ' extensions from Visual Studio Code!'
            : 'Successfully imported settings, keybindings, and snippets from Visual Studio Code!';

        const reload = await vscode.window.showInformationMessage(
            msg,
            'Reload Window'
        );
        if (reload === 'Reload Window') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    } catch (e) {
        vscode.window.showErrorMessage('Error importing from VS Code: ' + e.message);
    }
}

function triggerCodeAction(provider, commandKeyword) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('Open a file first to use VisionX Chat');
        return;
    }
    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showInformationMessage('Please select some code in the editor');
        return;
    }
    vscode.commands.executeCommand('visionx.aiView.focus');
    provider.sendExternalPrompt(commandKeyword + '\n```' + editor.document.languageId + '\n' + selection + '\n```');
}

class VisionXAIViewProvider {
    constructor(extensionUri, context) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._view = null;
    }

    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        const htmlPath = path.join(__dirname, 'media', 'webview.html');
        try {
            let html = fs.readFileSync(htmlPath, 'utf8');
            const jsUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js'));
            html = html.replace('{{WEBVIEW_JS_URI}}', jsUri.toString());
            webviewView.webview.html = html;
        } catch (e) {
            webviewView.webview.html = '<h3>Error loading Chat: ' + e.message + '</h3>';
        }

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'saveSettings': {
                    await this._context.globalState.update('visionx_settings_v4', data.settings);
                    break;
                }
                case 'getSettings': {
                    const settings = this._context.globalState.get('visionx_settings_v4') || {
                        provider: 'openrouter',
                        model: 'anthropic/claude-3.7-sonnet',
                        apiKey: '',
                        ollamaUrl: 'http://localhost:11434',
                        customModel: '',
                        discoveredModels: []
                    };
                    webviewView.webview.postMessage({ type: 'settingsLoaded', settings });
                    break;
                }
                case 'saveSessions': {
                    await this._context.globalState.update('visionx_chat_sessions', data.sessions);
                    if (data.activeSessionId) {
                        await this._context.globalState.update('visionx_active_session', data.activeSessionId);
                    }
                    break;
                }
                case 'getSessions': {
                    const sessions = this._context.globalState.get('visionx_chat_sessions') || [
                        { id: 'session_1', title: 'Main Session', messages: [] }
                    ];
                    const activeSessionId = this._context.globalState.get('visionx_active_session') || sessions[0]?.id;
                    webviewView.webview.postMessage({ type: 'sessionsLoaded', sessions, activeSessionId });
                    break;
                }
                case 'openProjectGraph': {
                    vscode.commands.executeCommand('visionx.openProjectGraph');
                    break;
                }
                case 'getActiveContext': {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        const sel = editor.document.getText(editor.selection);
                        webviewView.webview.postMessage({
                            type: 'activeContext',
                            fileName: path.basename(editor.document.fileName),
                            language: editor.document.languageId,
                            selection: sel || null
                        });
                    } else {
                        webviewView.webview.postMessage({ type: 'activeContext', fileName: null });
                    }
                    break;
                }
                case 'insertCode': {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.edit(editBuilder => {
                            if (!editor.selection.isEmpty) {
                                editBuilder.replace(editor.selection, data.code);
                            } else {
                                editBuilder.insert(editor.selection.active, data.code);
                            }
                        });
                        vscode.window.showInformationMessage('VisionX: Code inserted');
                    }
                    break;
                }
                case 'copyClipboard': {
                    await vscode.env.clipboard.writeText(data.code);
                    vscode.window.showInformationMessage('VisionX: Copied to clipboard');
                    break;
                }
                case 'scanModels': {
                    const { provider, baseUrl, apiKey } = data;
                    try {
                        const models = await fetchProviderModels(provider, baseUrl, apiKey);
                        webviewView.webview.postMessage({ type: 'modelsDiscovered', models, success: true });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'modelsDiscovered', models: [], error: err.message, success: false });
                    }
                    break;
                }
                case 'sendChat': {
                    const { reqId, provider, baseUrl, apiKey, model, prompt, messages, imageBase64 } = data;
                    try {
                        const reply = await executeChatCompletion({ provider, baseUrl, apiKey, model, prompt, messages, imageBase64 });
                        webviewView.webview.postMessage({ type: 'chatResponse', reqId, text: reply, success: true });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'chatResponse', reqId, text: null, error: err.message, success: false });
                    }
                    break;
                }
                case 'importVSCodeTrigger': {
                    await importFromVSCode(true);
                    break;
                }
            }
        });
    }

    sendExternalPrompt(prompt) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'runPrompt', prompt });
        }
    }
}

class VisionXGraphViewProvider {
    constructor(extensionUri, context, aiProvider) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._aiProvider = aiProvider;
    }

    resolveWebviewView(webviewView) {
        setupGraphWebview(webviewView.webview, this._extensionUri, this._context, this._aiProvider);
    }
}

function openProjectGraphEditor(context, aiProvider) {
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

    setupGraphWebview(panel.webview, context.extensionUri, context, aiProvider);
}

function setupGraphWebview(webview, extensionUri, context, aiProvider) {
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
            case 'sendExternalPrompt': {
                await vscode.commands.executeCommand('visionx.aiView.focus');
                if (aiProvider) {
                    aiProvider.sendExternalPrompt(data.prompt);
                }
                break;
            }
            case 'openChat': {
                await vscode.commands.executeCommand('visionx.aiView.focus');
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

async function fetchProviderModels(provider, baseUrl, apiKey) {
    baseUrl = (baseUrl || '').trim().replace(/\/+$/, '');
    const headers = {};
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://visionx.dev';
        headers['X-Title'] = 'VisionX';
    }

    if (provider === 'ollama' || provider === 'ollama_cloud') {
        let raw = baseUrl || 'http://localhost:11434';
        if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
            raw = 'http://' + raw;
        }

        if (raw.includes('ollama.com')) {
            throw new Error('ollama.com is a web portal, not an API server. Ollama runs on http://localhost:11434 or on your private server IP (e.g. http://192.168.1.100:11434).');
        }

        const baseHost = raw.replace(/\/(v1\/chat\/completions|api\/chat|api\/generate|v1|api)$/, '').replace(/\/+$/, '');
        let lastError = null;

        // 1. Try native Ollama /api/tags
        try {
            const resp = await fetch(`${baseHost}/api/tags`, {
                headers,
                signal: AbortSignal.timeout(6000)
            });
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data.models) && data.models.length > 0) {
                    return data.models.map(m => m.name || m.model).filter(Boolean);
                }
            } else {
                lastError = `HTTP ${resp.status} from ${baseHost}/api/tags`;
            }
        } catch (e) {
            lastError = e.message;
        }

        // 2. Try OpenAI-compatible /v1/models (modern Ollama, cloud Ollama proxies, LiteLLM)
        try {
            const resp = await fetch(`${baseHost}/v1/models`, {
                headers,
                signal: AbortSignal.timeout(6000)
            });
            if (resp.ok) {
                const data = await resp.json();
                const list = data.data || data.models || [];
                const found = list.map(m => typeof m === 'string' ? m : (m.id || m.name)).filter(Boolean);
                if (found.length > 0) return found;
            } else {
                lastError = `HTTP ${resp.status} from ${baseHost}/v1/models`;
            }
        } catch (e) {
            lastError = e.message;
        }

        throw new Error(`Could not reach Ollama at ${baseHost} (${lastError || 'Unreachable'}). Ensure Ollama is running ('ollama serve') or check your host URL.`);
    }

    if (provider === 'anthropic') {
        return [
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229'
        ];
    }

    if (provider === 'gemini') {
        if (!apiKey) {
            return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'];
        }
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                signal: AbortSignal.timeout(8000)
            });
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data.models)) {
                    return data.models
                        .map(m => m.name.replace(/^models\//, ''))
                        .filter(m => m.includes('gemini'));
                }
            }
        } catch (e) {}
        return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    }

    let scanUrl = baseUrl;
    if (!scanUrl.endsWith('/models')) {
        scanUrl = scanUrl.endsWith('/') ? `${scanUrl}models` : `${scanUrl}/models`;
    }

    try {
        const resp = await fetch(scanUrl, {
            headers,
            signal: AbortSignal.timeout(8000)
        });
        if (resp.ok) {
            const data = await resp.json();
            const rawList = data.data || data.models || [];
            const models = rawList.map(m => typeof m === 'string' ? m : (m.id || m.name)).filter(Boolean);
            if (models.length > 0) return models;
        }
    } catch (e) {
        if (apiKey) {
            throw new Error(`Model scan failed from ${scanUrl}: ${e.message}`);
        }
    }

    const defaults = {
        openrouter: ['anthropic/claude-3.7-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-r1', 'meta-llama/llama-3.3-70b-instruct', 'qwen/qwen-2.5-coder-32b-instruct'],
        openai: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4-turbo'],
        deepseek: ['deepseek-chat', 'deepseek-reasoner'],
        groq: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'llama-3.1-8b-instant'],
        xai: ['grok-2', 'grok-beta', 'grok-2-mini'],
        mistral: ['codestral-latest', 'mistral-large-latest', 'mistral-small-latest']
    };
    return defaults[provider] || ['default-model'];
}

async function executeChatCompletion({ provider, baseUrl, apiKey, model, prompt, messages }) {
    model = (model || 'llama3.3').trim();

    if (provider === 'ollama' || provider === 'ollama_cloud') {
        let raw = (baseUrl || 'http://localhost:11434').trim().replace(/\/+$/, '');
        if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
            raw = 'http://' + raw;
        }

        if (raw.includes('ollama.com')) {
            throw new Error('ollama.com is a web portal, not an API server. Ollama runs on http://localhost:11434 or on your private server IP (e.g. http://192.168.1.100:11434).');
        }

        const baseHost = raw.replace(/\/(v1\/chat\/completions|api\/chat|api\/generate|v1|api)$/, '').replace(/\/+$/, '');
        const ollamaHeaders = {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        };

        const endpoints = [];
        if (raw.endsWith('/api/chat')) {
            endpoints.push({ url: raw, type: 'chat' });
        } else if (raw.endsWith('/v1/chat/completions')) {
            endpoints.push({ url: raw, type: 'openai' });
        } else if (raw.endsWith('/api/generate')) {
            endpoints.push({ url: raw, type: 'generate' });
        }
        
        endpoints.push({ url: `${baseHost}/api/chat`, type: 'chat' });
        endpoints.push({ url: `${baseHost}/v1/chat/completions`, type: 'openai' });
        endpoints.push({ url: `${baseHost}/api/generate`, type: 'generate' });

        let lastErr = null;
        for (const ep of endpoints) {
            try {
                let payload;
                if (ep.type === 'chat' || ep.type === 'openai') {
                    payload = {
                        model,
                        messages: messages || [{ role: 'user', content: prompt }],
                        stream: false
                    };
                } else {
                    payload = {
                        model,
                        prompt: typeof prompt === 'string' ? prompt : (messages?.[messages.length - 1]?.content || ''),
                        stream: false
                    };
                }

                const resp = await fetch(ep.url, {
                    method: 'POST',
                    headers: ollamaHeaders,
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(90000)
                });

                if (resp.ok) {
                    const data = await resp.json();
                    if (ep.type === 'chat') {
                        return data.message?.content || data.response || '';
                    } else if (ep.type === 'openai') {
                        return data.choices?.[0]?.message?.content || '';
                    } else {
                        return data.response || '';
                    }
                }

                const errBody = await resp.text();
                lastErr = `HTTP ${resp.status} from ${ep.url}: ${errBody}`;
                if (resp.status === 404 && (errBody.includes('not found') || errBody.includes('404'))) {
                    continue;
                }
                throw new Error(lastErr);
            } catch (err) {
                if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.includes('model') || err.message.includes('ollama.com'))) {
                    throw err;
                }
                lastErr = err.message;
            }
        }

        throw new Error(`Ollama connection error at ${baseHost}: ${lastErr || 'Endpoint unreachable'}. Ensure model '${model}' is pulled ('ollama pull ${model}').`);
    }

    if (provider === 'anthropic') {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(60000)
        });
        if (!resp.ok) throw new Error(`Anthropic error (${resp.status}): ${await resp.text()}`);
        const data = await resp.json();
        return data.content?.[0]?.text || '';
    }

    if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
            signal: AbortSignal.timeout(60000)
        });
        if (!resp.ok) throw new Error(`Gemini error (${resp.status}): ${await resp.text()}`);
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Standard OpenAI compatible
    const headers = {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    };
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://visionx.dev';
        headers['X-Title'] = 'VisionX';
    }

    let chatUrl = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
    if (!chatUrl.endsWith('/chat/completions')) {
        chatUrl = `${chatUrl}/chat/completions`;
    }

    const resp = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: messages || [
                { role: 'system', content: 'You are VisionX, an advanced autonomous coding companion. Provide precise, clean code solutions.' },
                { role: 'user', content: prompt }
            ]
        }),
        signal: AbortSignal.timeout(60000)
    });
    if (!resp.ok) throw new Error(`${provider} error (${resp.status}): ${await resp.text()}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
}

module.exports = { activate, deactivate: () => {} };
