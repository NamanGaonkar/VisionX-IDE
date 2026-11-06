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

    context.subscriptions.push(
        vscode.commands.registerCommand('visionx.askAI', () => {
            vscode.commands.executeCommand('visionx.aiView.focus');
        }),
        vscode.commands.registerCommand('visionx.explainCode', () => {
            triggerCodeAction(provider, 'Explain this code in detail and highlight edge cases:');
        }),
        vscode.commands.registerCommand('visionx.refactorCode', () => {
            triggerCodeAction(provider, 'Refactor this code for optimal performance, readability, and modern idioms:');
        }),
        vscode.commands.registerCommand('visionx.fixErrors', () => {
            triggerCodeAction(provider, 'Identify any bugs or logical errors in this code and return the fix:');
        })
    );
}

function triggerCodeAction(provider, promptPrefix) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('Open a file first to use VisionX AI');
        return;
    }
    const selection = editor.document.getText(editor.selection);
    if (!selection) {
        vscode.window.showInformationMessage('Please select some code in the editor');
        return;
    }
    vscode.commands.executeCommand('visionx.aiView.focus');
    provider.sendExternalPrompt(promptPrefix + '\n```' + editor.document.languageId + '\n' + selection + '\n```');
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
            webviewView.webview.html = '<h3>Error loading VisionX AI Webview: ' + e.message + '</h3>';
        }

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'saveSettings': {
                    await this._context.globalState.update('visionx_settings_v3', data.settings);
                    break;
                }
                case 'getSettings': {
                    const settings = this._context.globalState.get('visionx_settings_v3') || {
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
                        vscode.window.showInformationMessage('VisionX: Code applied');
                    }
                    break;
                }
                case 'copyClipboard': {
                    await vscode.env.clipboard.writeText(data.code);
                    vscode.window.showInformationMessage('VisionX: Copied to clipboard');
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
