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
        vscode.commands.registerCommand('visionx.openProjectGraph', () => {
            openProjectGraphEditor(context, aiProvider);
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

    // First launch check: Offer to import from VS Code
    checkFirstLaunchImport(context);
}

async function checkFirstLaunchImport(context) {
    const hasPrompted = context.globalState.get('visionx_imported_or_prompted');
    if (!hasPrompted) {
        await context.globalState.update('visionx_imported_or_prompted', true);
        
        const vscodeUserData = path.join(process.env.APPDATA || '', 'Code', 'User');
        if (fs.existsSync(vscodeUserData)) {
            const choice = await vscode.window.showInformationMessage(
                'Welcome to VisionX! Would you like to import your settings, keybindings, and extensions from Visual Studio Code?',
                'Import from VS Code',
                'Start Clean'
            );
            if (choice === 'Import from VS Code') {
                await importFromVSCode(false);
            }
        }
    }
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
        const visionxExt = path.join(userProfile, '.visionx', 'extensions');
        let extCount = 0;
        if (fs.existsSync(vscodeExt)) {
            fs.mkdirSync(visionxExt, { recursive: true });
            const extJsonSrc = path.join(vscodeExt, 'extensions.json');
            const extJsonDest = path.join(visionxExt, 'extensions.json');
            if (fs.existsSync(extJsonSrc)) {
                try { fs.copyFileSync(extJsonSrc, extJsonDest); } catch {}
            }
            const entries = fs.readdirSync(vscodeExt);
            for (const item of entries) {
                if (!item.startsWith('.')) {
                    const srcItem = path.join(vscodeExt, item);
                    const destItem = path.join(visionxExt, item);
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
            case 'askChat': {
                await vscode.commands.executeCommand('visionx.aiView.focus');
                if (aiProvider) {
                    aiProvider.sendExternalPrompt(data.prompt);
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
