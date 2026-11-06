const vscode = require('vscode');

function activate(context) {
    const provider = new VisionXAIViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('visionx.aiView', provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('visionx.askAI', () => {
            vscode.commands.executeCommand('visionx.aiView.focus');
        }),
        vscode.commands.registerCommand('visionx.explainCode', () => {
            triggerCodeAction(provider, 'Explain this code in detail and highlight edge cases:');
        }),
        vscode.commands.registerCommand('visionx.refactorCode', () => {
            triggerCodeAction(provider, 'Refactor this code for optimal performance, readability, and modern idioms. Provide the improved version:');
        }),
        vscode.commands.registerCommand('visionx.fixErrors', () => {
            triggerCodeAction(provider, 'Identify any bugs, logical errors, or potential memory leaks in this code and provide the fixed code:');
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
        vscode.window.showInformationMessage('Please select some code to analyze');
        return;
    }
    vscode.commands.executeCommand('visionx.aiView.focus');
    provider.sendExternalPrompt(`${promptPrefix}\n\`\`\`${editor.document.languageId}\n${selection}\n\`\`\``);
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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'saveSettings': {
                    await this._context.globalState.update('visionx_settings', data.settings);
                    break;
                }
                case 'getSettings': {
                    const settings = this._context.globalState.get('visionx_settings') || {
                        provider: 'openrouter',
                        model: 'anthropic/claude-3.7-sonnet',
                        apiKey: '',
                        ollamaUrl: 'http://localhost:11434',
                        customModel: ''
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
                            fileName: editor.document.fileName.split(/[\\/]/).pop(),
                            language: editor.document.languageId,
                            selection: sel || null,
                            fullContent: editor.document.getText()
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
                        vscode.window.showInformationMessage('VisionX: Code applied to editor');
                    }
                    break;
                }
                case 'copyClipboard': {
                    await vscode.env.clipboard.writeText(data.code);
                    vscode.window.showInformationMessage('VisionX: Code copied to clipboard');
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

    _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisionX Intelligence</title>
  <style>
    :root {
      --bg: #090b12;
      --card-bg: rgba(18, 22, 36, 0.7);
      --glass-border: rgba(255, 85, 0, 0.25);
      --accent-glow: #ff5500;
      --accent-gold: #ffaa00;
      --accent-red: #ff2a4b;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .header {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(10, 12, 20, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--glass-border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(90deg, #ff3300, #ff9900);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .gear-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
      transition: color 0.2s;
    }
    .gear-btn:hover { color: var(--accent-gold); }
    
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg {
      padding: 10px 12px;
      border-radius: 8px;
      line-height: 1.45;
      font-size: 13px;
      max-width: 95%;
      word-break: break-word;
    }
    .msg.user {
      align-self: flex-end;
      background: linear-gradient(135deg, rgba(255, 69, 0, 0.2), rgba(255, 140, 0, 0.25));
      border: 1px solid rgba(255, 85, 0, 0.4);
      color: #fff;
    }
    .msg.ai {
      align-self: flex-start;
      background: var(--card-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      color: #e2e8f0;
      width: 100%;
    }
    .code-block {
      background: #05060a;
      border: 1px solid rgba(255, 85, 0, 0.3);
      border-radius: 6px;
      margin: 8px 0;
      overflow: hidden;
    }
    .code-header {
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      background: #0d101a;
      font-size: 11px;
      color: var(--accent-gold);
      border-bottom: 1px solid rgba(255, 85, 0, 0.15);
    }
    .code-header button {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
      margin-left: 8px;
    }
    .code-header button:hover { color: #fff; }
    pre {
      padding: 8px;
      overflow-x: auto;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      color: #00f0a8;
    }

    .input-box {
      padding: 10px;
      background: rgba(10, 12, 20, 0.95);
      border-top: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .context-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .badge {
      background: rgba(255, 85, 0, 0.15);
      color: var(--accent-gold);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255, 85, 0, 0.3);
    }
    textarea {
      width: 100%;
      height: 65px;
      background: #0f121d;
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      color: #fff;
      padding: 8px;
      resize: none;
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }
    textarea:focus { border-color: var(--accent-glow); }
    .action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .img-upload-label {
      color: var(--text-muted);
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .img-upload-label:hover { color: var(--accent-gold); }
    .send-btn {
      background: linear-gradient(90deg, #ff4500, #ff8c00);
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.2s;
    }
    .send-btn:hover { filter: brightness(1.2); }

    /* Settings Modal */
    #settings-modal {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(5, 7, 12, 0.95);
      backdrop-filter: blur(12px);
      padding: 16px;
      display: none;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      z-index: 100;
    }
    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .setting-group label {
      font-size: 11px;
      color: var(--accent-gold);
      text-transform: uppercase;
      font-weight: 700;
    }
    .setting-group select, .setting-group input {
      background: #0f121d;
      border: 1px solid var(--glass-border);
      color: #fff;
      padding: 6px;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
    }
    .save-btn {
      background: #ff5500;
      color: #fff;
      border: none;
      padding: 8px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4L12 21L20 4H16L12 14.5L8 4H4Z" fill="#ff5500"/></svg>
      <span>VisionX AI Core</span>
    </div>
    <button class="gear-btn" id="open-settings" title="BYOK Configuration">⚙</button>
  </div>

  <div class="chat-container" id="chat">
    <div class="msg ai">
      ⚡ <b>VisionX Neural Core Activated</b><br>
      Ready with full Bring-Your-Own-Key support. Powered by all planetary models (OpenRouter, Claude, GPT-4o, DeepSeek, Gemini, Ollama local). Select code or ask any architectural question.
    </div>
  </div>

  <div class="input-box">
    <div class="context-bar">
      <span>Context:</span>
      <span class="badge" id="active-file">No File</span>
      <span class="badge" id="active-model">OpenRouter</span>
    </div>
    <div id="image-preview" style="display:none; align-items:center; gap:8px;">
      <span style="font-size:11px; color:#ffaa00;">📸 Image Attached</span>
      <button id="clear-img" style="background:transparent; border:none; color:#ff3366; cursor:pointer;">✕</button>
    </div>
    <textarea id="prompt" placeholder="Ask VisionX, refactor, generate, or paste screenshot..."></textarea>
    <div class="action-row">
      <label class="img-upload-label">
        📷 Vision
        <input type="file" id="img-input" accept="image/*" style="display:none;">
      </label>
      <button class="send-btn" id="send-btn">Generate</button>
    </div>
  </div>

  <div id="settings-modal">
    <h3 style="color:#ffaa00; margin-bottom:8px;">VisionX BYOK AI Settings</h3>
    <div class="setting-group">
      <label>AI Provider</label>
      <select id="set-provider">
        <option value="openrouter">OpenRouter (All Planetary Models)</option>
        <option value="anthropic">Anthropic Claude</option>
        <option value="openai">OpenAI Direct</option>
        <option value="gemini">Google Gemini</option>
        <option value="deepseek">DeepSeek AI</option>
        <option value="groq">Groq (Ultra-Fast)</option>
        <option value="mistral">Mistral AI</option>
        <option value="ollama">Ollama (100% Local / Free)</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Preset Model</label>
      <select id="set-model">
        <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet (OpenRouter)</option>
        <option value="deepseek/deepseek-r1">DeepSeek R1 (OpenRouter)</option>
        <option value="deepseek/deepseek-chat">DeepSeek V3 (OpenRouter)</option>
        <option value="openai/gpt-4o">GPT-4o (OpenRouter)</option>
        <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (OpenRouter)</option>
        <option value="qwen/qwen-2.5-coder-32b-instruct">Qwen 2.5 Coder (OpenRouter)</option>
        <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Anthropic)</option>
        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Anthropic)</option>
        <option value="gpt-4o">GPT-4o (OpenAI)</option>
        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google)</option>
        <option value="deepseek-chat">DeepSeek V3 (Direct)</option>
        <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
        <option value="qwen2.5-coder:latest">Qwen 2.5 Coder (Ollama Local)</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Custom Model Name (Optional Override)</label>
      <input type="text" id="set-custom-model" placeholder="e.g. meta-llama/llama-3.3-70b-instruct">
    </div>
    <div class="setting-group">
      <label>API Key</label>
      <input type="password" id="set-api-key" placeholder="Paste your API Key (BYOK)">
    </div>
    <div class="setting-group">
      <label>Local Ollama URL</label>
      <input type="text" id="set-ollama-url" value="http://localhost:11434">
    </div>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button class="save-btn" id="save-settings" style="flex:1;">Save Configuration</button>
      <button id="close-settings" style="background:#222; color:#fff; border:none; padding:8px; border-radius:4px; cursor:pointer;">Cancel</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const chat = document.getElementById('chat');
    const promptInput = document.getElementById('prompt');
    const sendBtn = document.getElementById('send-btn');
    const openSettings = document.getElementById('open-settings');
    const closeSettings = document.getElementById('close-settings');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const activeFileBadge = document.getElementById('active-file');
    const activeModelBadge = document.getElementById('active-model');
    const imgInput = document.getElementById('img-input');
    const imgPreview = document.getElementById('image-preview');
    const clearImg = document.getElementById('clear-img');

    let currentSettings = {
      provider: 'openrouter',
      model: 'anthropic/claude-3.7-sonnet',
      apiKey: '',
      ollamaUrl: 'http://localhost:11434',
      customModel: ''
    };
    let activeContext = { fileName: null, selection: null, fullContent: null };
    let attachedImageBase64 = null;

    vscode.postMessage({ type: 'getSettings' });
    setInterval(() => vscode.postMessage({ type: 'getActiveContext' }), 2000);

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'settingsLoaded') {
        currentSettings = msg.settings || currentSettings;
        document.getElementById('set-provider').value = currentSettings.provider || 'openrouter';
        document.getElementById('set-model').value = currentSettings.model || 'anthropic/claude-3.7-sonnet';
        document.getElementById('set-api-key').value = currentSettings.apiKey || '';
        document.getElementById('set-ollama-url').value = currentSettings.ollamaUrl || 'http://localhost:11434';
        document.getElementById('set-custom-model').value = currentSettings.customModel || '';
        activeModelBadge.textContent = currentSettings.customModel || currentSettings.model.split('/').pop();
      } else if (msg.type === 'activeContext') {
        activeContext = msg;
        activeFileBadge.textContent = msg.fileName ? msg.fileName : 'Workspace';
      } else if (msg.type === 'runPrompt') {
        promptInput.value = msg.prompt;
        executeAI();
      }
    });

    openSettings.onclick = () => settingsModal.style.display = 'flex';
    closeSettings.onclick = () => settingsModal.style.display = 'none';

    saveSettingsBtn.onclick = () => {
      currentSettings.provider = document.getElementById('set-provider').value;
      currentSettings.model = document.getElementById('set-model').value;
      currentSettings.apiKey = document.getElementById('set-api-key').value;
      currentSettings.ollamaUrl = document.getElementById('set-ollama-url').value;
      currentSettings.customModel = document.getElementById('set-custom-model').value;
      activeModelBadge.textContent = currentSettings.customModel || currentSettings.model.split('/').pop();
      vscode.postMessage({ type: 'saveSettings', settings: currentSettings });
      settingsModal.style.display = 'none';
    };

    imgInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          attachedImageBase64 = reader.result;
          imgPreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
      }
    };
    clearImg.onclick = () => {
      attachedImageBase64 = null;
      imgPreview.style.display = 'none';
      imgInput.value = '';
    };

    sendBtn.onclick = executeAI;
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        executeAI();
      }
    });

    async function executeAI() {
      const text = promptInput.value.trim();
      if (!text && !attachedImageBase64) return;
      promptInput.value = '';

      appendMessage(text, 'user');
      const aiMsgEl = appendMessage('Thinking...', 'ai');

      try {
        const chosenModel = currentSettings.customModel || currentSettings.model;
        let endpoint = '';
        let headers = { 'Content-Type': 'application/json' };
        let body = {};

        if (currentSettings.provider === 'openrouter') {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          headers['Authorization'] = 'Bearer ' + currentSettings.apiKey;
          headers['HTTP-Referer'] = 'https://visionx.dev';
          headers['X-Title'] = 'VisionX IDE';

          const content = [];
          if (attachedImageBase64) {
            content.push({ type: 'image_url', image_url: { url: attachedImageBase64 } });
          }
          let userPrompt = text;
          if (activeContext.selection) {
            userPrompt += `\n\n[Active Selection in ${activeContext.fileName}]:\n` + activeContext.selection;
          }
          content.push({ type: 'text', text: userPrompt });

          body = {
            model: chosenModel,
            messages: [
              { role: 'system', content: 'You are VisionX Neural Assistant, an elite AI coding engine. Provide direct, clean code and precise solutions.' },
              { role: 'user', content: content }
            ]
          };
        } else if (currentSettings.provider === 'ollama') {
          endpoint = currentSettings.ollamaUrl + '/api/generate';
          body = {
            model: chosenModel,
            prompt: text + (activeContext.selection ? '\n\nSelected code:\n' + activeContext.selection : ''),
            stream: false
          };
        } else if (currentSettings.provider === 'openai' || currentSettings.provider === 'deepseek' || currentSettings.provider === 'groq' || currentSettings.provider === 'mistral') {
          const map = {
            openai: 'https://api.openai.com/v1/chat/completions',
            deepseek: 'https://api.deepseek.com/chat/completions',
            groq: 'https://api.groq.com/openai/v1/chat/completions',
            mistral: 'https://api.mistral.ai/v1/chat/completions'
          };
          endpoint = map[currentSettings.provider];
          headers['Authorization'] = 'Bearer ' + currentSettings.apiKey;
          body = {
            model: chosenModel,
            messages: [
              { role: 'system', content: 'You are VisionX Neural Assistant. Provide clean code and direct solutions.' },
              { role: 'user', content: text + (activeContext.selection ? '\n\nContext:\n' + activeContext.selection : '') }
            ]
          };
        } else if (currentSettings.provider === 'anthropic') {
          endpoint = 'https://api.anthropic.com/v1/messages';
          headers['x-api-key'] = currentSettings.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          body = {
            model: chosenModel,
            max_tokens: 4096,
            messages: [{ role: 'user', content: text }]
          };
        }

        if (!currentSettings.apiKey && currentSettings.provider !== 'ollama') {
          aiMsgEl.innerHTML = '⚠️ <b>API Key required!</b> Click the ⚙ icon in the top right to configure your API key for ' + currentSettings.provider + '.';
          return;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const err = await res.text();
          aiMsgEl.innerHTML = '❌ <b>Error:</b> ' + err;
          return;
        }

        const data = await res.json();
        let reply = '';
        if (currentSettings.provider === 'ollama') {
          reply = data.response;
        } else if (currentSettings.provider === 'anthropic') {
          reply = data.content?.[0]?.text || '';
        } else {
          reply = data.choices?.[0]?.message?.content || '';
        }

        renderMarkdown(aiMsgEl, reply);
      } catch (e) {
        aiMsgEl.innerHTML = '❌ <b>Failed to connect:</b> ' + e.message;
      }
    }

    function appendMessage(text, sender) {
      const msg = document.createElement('div');
      msg.className = 'msg ' + sender;
      msg.textContent = text;
      chat.appendChild(msg);
      chat.scrollTop = chat.scrollHeight;
      return msg;
    }

    function renderMarkdown(el, text) {
      el.innerHTML = '';
      const parts = text.split(/(```[\s\S]*?```)/g);
      for (const part of parts) {
        if (part.startsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const lang = lines[0].trim();
          const code = lines.slice(1).join('\n') || lines[0];

          const block = document.createElement('div');
          block.className = 'code-block';
          block.innerHTML = `
            <div class="code-header">
              <span>${lang || 'code'}</span>
              <div>
                <button class="copy-btn">Copy</button>
                <button class="apply-btn">Apply to Editor</button>
              </div>
            </div>
            <pre><code>${escapeHtml(code)}</code></pre>
          `;
          block.querySelector('.copy-btn').onclick = () => vscode.postMessage({ type: 'copyClipboard', code });
          block.querySelector('.apply-btn').onclick = () => vscode.postMessage({ type: 'insertCode', code });
          el.appendChild(block);
        } else if (part.trim()) {
          const p = document.createElement('div');
          p.innerHTML = escapeHtml(part).replace(/\n/g, '<br>');
          el.appendChild(p);
        }
      }
      chat.scrollTop = chat.scrollHeight;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>`;
    }
}

module.exports = { activate, deactivate: () => {} };
