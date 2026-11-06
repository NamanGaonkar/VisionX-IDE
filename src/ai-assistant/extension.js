const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    const provider = new VisionXAIViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('visionx.aiView', provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('visionx.askAI', () => {
            vscode.commands.executeCommand('visionx.aiView.focus');
        }),
        vscode.commands.registerCommand('visionx.explainCode', () => {
            triggerCodeAction(provider, '/explain');
        }),
        vscode.commands.registerCommand('visionx.refactorCode', () => {
            triggerCodeAction(provider, '/refactor');
        }),
        vscode.commands.registerCommand('visionx.fixErrors', () => {
            triggerCodeAction(provider, '/fix');
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

module.exports = { activate, deactivate: () => {} };
