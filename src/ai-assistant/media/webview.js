const vscode = acquireVsCodeApi();

const chatMessages = document.getElementById('chat-messages');
const emptyState = document.getElementById('empty-state');
const promptInput = document.getElementById('copilot-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const refreshChatBtn = document.getElementById('refresh-chat-btn');
const headerSettingsBtn = document.getElementById('header-settings-btn');

const sessionsToggle = document.getElementById('sessions-toggle');
const sessionsDrawer = document.getElementById('sessions-drawer');
const sessionsList = document.getElementById('sessions-list');
const drawerNewSessionBtn = document.getElementById('drawer-new-session');
const activeSessionName = document.getElementById('active-session-name');

const linkOpenGraph = document.getElementById('link-open-graph');
const cardCloseBtn = document.getElementById('card-close-btn');
const customizationsCard = document.getElementById('customizations-card');

const modelPillBtn = document.getElementById('model-pill-btn');
const modelPillText = document.getElementById('model-pill-text');
const modelPopover = document.getElementById('model-popover');
const popCloseX = document.getElementById('pop-close-x');
const popProvider = document.getElementById('pop-provider');
const popBaseUrl = document.getElementById('pop-base-url');
const popApiKey = document.getElementById('pop-api-key');
const popModel = document.getElementById('pop-model');
const popStatus = document.getElementById('pop-status');
const popScanBtn = document.getElementById('pop-scan-btn');
const popSaveBtn = document.getElementById('pop-save-btn');
const popCancelBtn = document.getElementById('pop-cancel-btn');

const imageUpload = document.getElementById('image-upload');
const attachedImgTag = document.getElementById('attached-img-tag');
const activeContextLabel = document.getElementById('active-context-label');

const PROVIDER_DEFAULTS = {
  copilot:      { url: '', defaultModel: 'copilot/gpt-4o' },
  ollama_cloud: { url: 'https://ollama.com/api', defaultModel: 'llama3.3' },
  ollama:       { url: 'http://localhost:11434', defaultModel: 'llama3.3' },
  openrouter:   { url: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.7-sonnet' },
  custom:       { url: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
  openai:       { url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  anthropic:    { url: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-7-sonnet-20250219' },
  gemini:       { url: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.5-flash' },
  deepseek:     { url: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  groq:         { url: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  xai:          { url: 'https://api.x.ai/v1', defaultModel: 'grok-2' },
  mistral:      { url: 'https://api.mistral.ai/v1', defaultModel: 'codestral-latest' },
  together:     { url: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
  perplexity:   { url: 'https://api.perplexity.ai', defaultModel: 'sonar-pro' },
  cerebras:     { url: 'https://api.cerebras.ai/v1', defaultModel: 'llama3.3-70b' },
  fireworks:    { url: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  cohere:       { url: 'https://api.cohere.ai/v1', defaultModel: 'command-r-plus' },
  deepinfra:    { url: 'https://api.deepinfra.com/v1/openai', defaultModel: 'meta-llama/Meta-Llama-3.3-70B-Instruct' },
  sambanova:    { url: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.3-70B-Instruct' },
  hyperbolic:   { url: 'https://api.hyperbolic.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct' },
  novita:       { url: 'https://api.novita.ai/v3/openai', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
  lmstudio:     { url: 'http://localhost:1234/v1', defaultModel: 'local-model' }
};

let currentSettings = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'anthropic/claude-3.7-sonnet',
  customModel: '',
  discoveredModels: []
};

// Sessions Architecture
let sessions = [
  { id: 'session_1', title: 'Main Session', messages: [] }
];
let activeSessionId = 'session_1';

let activeContext = { fileName: null, selection: null };
let attachedImageBase64 = null;
const pendingRequests = new Map();

// Initial sync
vscode.postMessage({ type: 'getSettings' });
vscode.postMessage({ type: 'getSessions' });
setInterval(() => vscode.postMessage({ type: 'getActiveContext' }), 2000);

window.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'settingsLoaded') {
    if (msg.settings) {
      currentSettings = Object.assign(currentSettings, msg.settings);
    }
    const prov = currentSettings.provider || 'openrouter';
    popProvider.value = prov;
    popBaseUrl.value = currentSettings.baseUrl || PROVIDER_DEFAULTS[prov]?.url || '';
    popApiKey.value = currentSettings.apiKey || '';
    popModel.value = currentSettings.model || currentSettings.customModel || PROVIDER_DEFAULTS[prov]?.defaultModel || '';

    const baseUrlRow = document.getElementById('pop-baseurl-row');
    const apiKeyRow = document.getElementById('pop-apikey-row');
    if (prov === 'copilot') {
      if (baseUrlRow) baseUrlRow.style.display = 'none';
      if (apiKeyRow) apiKeyRow.style.display = 'none';
    } else {
      if (baseUrlRow) baseUrlRow.style.display = 'flex';
      if (apiKeyRow) apiKeyRow.style.display = 'flex';
    }

    if (currentSettings.discoveredModels && currentSettings.discoveredModels.length > 0) {
      populateModelSuggestions(currentSettings.discoveredModels);
    } else if (prov === 'copilot' || currentSettings.apiKey || prov === 'ollama' || prov === 'ollama_cloud' || prov === 'lmstudio') {
      detectModels();
    }
    updatePill();
  } else if (msg.type === 'sessionsLoaded') {
    if (msg.sessions && msg.sessions.length > 0) {
      sessions = msg.sessions;
      activeSessionId = msg.activeSessionId || sessions[0].id;
    }
    renderActiveSessionMessages();
    renderSessionsList();
  } else if (msg.type === 'activeContext') {
    activeContext = msg;
    if (msg.fileName) {
      activeContextLabel.textContent = msg.fileName + (msg.selection ? ' (selected)' : '');
    } else {
      activeContextLabel.textContent = 'Ready';
    }
  } else if (msg.type === 'copilotModelsUpdated' || msg.type === 'modelsDiscovered') {
    if (msg.models && Array.isArray(msg.models) && msg.models.length > 0) {
      currentSettings.discoveredModels = msg.models;
      populateModelSuggestions(msg.models);
      if (!popModel.value || !msg.models.includes(popModel.value)) {
        popModel.value = msg.models[0];
        currentSettings.model = msg.models[0];
      }
      updatePill();
      popStatus.style.color = '#4ade80';
      popStatus.textContent = msg.models.length + ' real chat models verified and loaded.';
    } else {
      popStatus.style.color = '#f87171';
      popStatus.textContent = msg.error ? ('Connection error: ' + msg.error) : 'No models detected from endpoint.';
    }
  } else if (msg.type === 'chatResponse') {
    const aiEl = pendingRequests.get(msg.reqId);
    if (aiEl) {
      pendingRequests.delete(msg.reqId);
      if (msg.success && msg.text) {
        renderMarkdown(aiEl, msg.text);
        const s = getActiveSession();
        s.messages.push({ role: 'assistant', content: msg.text });
        saveSessionsToExtension();
      } else {
        aiEl.innerHTML = '<span style="color:#ff5f56;">Error: ' + escapeHtml(msg.error || 'Request failed') + '</span>';
      }
    }
  } else if (msg.type === 'runPrompt') {
    promptInput.value = msg.prompt;
    handleSend();
  }
});

// Sessions Management
function getActiveSession() {
  let s = sessions.find(x => x.id === activeSessionId);
  if (!s) {
    s = sessions[0] || { id: 'session_1', title: 'Main Session', messages: [] };
    activeSessionId = s.id;
  }
  return s;
}

function renderSessionsList() {
  sessionsList.innerHTML = '';
  sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'session-item' + (s.id === activeSessionId ? ' active' : '');
    
    const label = document.createElement('span');
    label.textContent = s.title + ' (' + (s.messages ? s.messages.length : 0) + ')';
    label.onclick = () => switchSession(s.id);

    const del = document.createElement('span');
    del.className = 'session-delete';
    del.textContent = '✕';
    del.onclick = (e) => {
      e.stopPropagation();
      deleteSession(s.id);
    };

    item.appendChild(label);
    if (sessions.length > 1) {
      item.appendChild(del);
    }
    sessionsList.appendChild(item);
  });

  const active = getActiveSession();
  activeSessionName.textContent = '(' + active.title + ')';
}

function switchSession(id) {
  activeSessionId = id;
  renderActiveSessionMessages();
  renderSessionsList();
  sessionsDrawer.style.display = 'none';
  saveSessionsToExtension();
}

function createNewSession() {
  const newId = 'session_' + Date.now();
  const num = sessions.length + 1;
  const newSession = { id: newId, title: 'Session ' + num, messages: [] };
  sessions.unshift(newSession);
  activeSessionId = newId;
  renderActiveSessionMessages();
  renderSessionsList();
  sessionsDrawer.style.display = 'none';
  saveSessionsToExtension();
}

function deleteSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  if (sessions.length === 0) {
    sessions = [{ id: 'session_' + Date.now(), title: 'Main Session', messages: [] }];
  }
  if (activeSessionId === id) {
    activeSessionId = sessions[0].id;
  }
  renderActiveSessionMessages();
  renderSessionsList();
  saveSessionsToExtension();
}

function saveSessionsToExtension() {
  vscode.postMessage({ type: 'saveSessions', sessions, activeSessionId });
}

function renderActiveSessionMessages() {
  chatMessages.innerHTML = '';
  const current = getActiveSession();
  if (!current.messages || current.messages.length === 0) {
    if (emptyState) chatMessages.appendChild(emptyState);
    return;
  }

  current.messages.forEach(m => {
    if (m.role === 'user') {
      appendUserMsg(m.content, false);
    } else {
      const el = appendAIMsg('', false);
      renderMarkdown(el, m.content);
    }
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Sessions Toggle
if (sessionsToggle) {
  sessionsToggle.onclick = () => {
    const isShown = sessionsDrawer.style.display === 'flex';
    sessionsDrawer.style.display = isShown ? 'none' : 'flex';
  };
}
if (drawerNewSessionBtn) drawerNewSessionBtn.onclick = createNewSession;
if (newChatBtn) newChatBtn.onclick = createNewSession;
if (refreshChatBtn) {
  refreshChatBtn.onclick = () => {
    const s = getActiveSession();
    s.messages = [];
    renderActiveSessionMessages();
    saveSessionsToExtension();
  };
}

// Open Graph link handler
if (linkOpenGraph) {
  linkOpenGraph.onclick = (e) => {
    e.preventDefault();
    vscode.postMessage({ type: 'openProjectGraph' });
  };
}
if (cardCloseBtn) {
  cardCloseBtn.onclick = () => {
    if (customizationsCard) customizationsCard.style.display = 'none';
  };
}

// Provider Popover Handlers
popProvider.onchange = () => {
  const prov = popProvider.value;
  const baseUrlRow = document.getElementById('pop-baseurl-row');
  const apiKeyRow = document.getElementById('pop-apikey-row');

  if (prov === 'copilot') {
    if (baseUrlRow) baseUrlRow.style.display = 'none';
    if (apiKeyRow) apiKeyRow.style.display = 'none';
    popModel.placeholder = 'e.g. copilot/gpt-4o, claude-3.5-sonnet';
    popStatus.style.color = '#94a3b8';
    popStatus.textContent = 'Using VS Code native Language Model API & Copilot authentication.';
  } else {
    if (baseUrlRow) baseUrlRow.style.display = 'flex';
    if (apiKeyRow) apiKeyRow.style.display = 'flex';

    if (prov === 'ollama') {
      popBaseUrl.value = 'http://localhost:11434';
      popModel.placeholder = 'e.g. llama3.3, mistral, codellama';
    } else if (prov === 'ollama_cloud') {
      popBaseUrl.value = 'https://ollama.com/api';
      popBaseUrl.placeholder = 'https://ollama.com/api or your cloud Ollama host';
      popModel.placeholder = 'e.g. llama3.3, gemma4:31b, deepseek-r1';
    } else if (PROVIDER_DEFAULTS[prov]) {
      popBaseUrl.value = PROVIDER_DEFAULTS[prov].url;
      popModel.value = PROVIDER_DEFAULTS[prov].defaultModel;
      popModel.placeholder = 'e.g. ' + PROVIDER_DEFAULTS[prov].defaultModel;
    }
    popStatus.style.color = '#94a3b8';
    popStatus.textContent = 'Configure credentials for ' + prov.toUpperCase() + '.';
  }
  detectModels();
};

if (popScanBtn) {
  popScanBtn.onclick = () => detectModels();
}

popApiKey.onblur = () => {
  if (popApiKey.value.trim()) {
    detectModels();
  }
};

function togglePopover() {
  const isShown = modelPopover.style.display === 'flex';
  modelPopover.style.display = isShown ? 'none' : 'flex';
}

modelPillBtn.onclick = togglePopover;
if (headerSettingsBtn) {
  headerSettingsBtn.onclick = togglePopover;
}
if (popCloseX) {
  popCloseX.onclick = () => {
    modelPopover.style.display = 'none';
  };
}

popCancelBtn.onclick = () => {
  modelPopover.style.display = 'none';
};

popSaveBtn.onclick = () => {
  currentSettings.provider = popProvider.value;
  currentSettings.baseUrl = popBaseUrl.value.trim() || PROVIDER_DEFAULTS[currentSettings.provider]?.url || '';
  currentSettings.apiKey = popApiKey.value.trim();
  currentSettings.model = popModel.value.trim() || PROVIDER_DEFAULTS[currentSettings.provider]?.defaultModel || 'llama3.3';
  currentSettings.customModel = currentSettings.model;
  updatePill();
  vscode.postMessage({ type: 'saveSettings', settings: currentSettings });
  modelPopover.style.display = 'none';
};

function updatePill() {
  const active = currentSettings.model || 'VisionX AI';
  const name = active.split('/').pop().replace(/-20\d\d\d\d\d\d/g, '');
  modelPillText.textContent = name;
}

function detectModels() {
  const provider = popProvider.value;
  const baseUrl = (popBaseUrl.value.trim() || PROVIDER_DEFAULTS[provider]?.url || '').replace(/\/+$/, '');
  const apiKey = popApiKey.value.trim();

  popStatus.style.color = '#94a3b8';
  if (provider === 'copilot') {
    popStatus.textContent = 'Querying GitHub Copilot / VS Code Language Model API...';
  } else {
    popStatus.textContent = 'Scanning real models from ' + provider.toUpperCase() + '...';
  }

  // Request models from Node extension backend (100% bypasses browser webview CORS!)
  vscode.postMessage({
    type: 'scanModels',
    provider: provider,
    baseUrl: baseUrl,
    apiKey: apiKey
  });
}

function populateModelSuggestions(models) {
  const datalist = document.getElementById('model-suggestions');
  if (!datalist) return;
  datalist.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m;
    datalist.appendChild(opt);
  }
}

// Image upload
imageUpload.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      attachedImageBase64 = reader.result;
      attachedImgTag.style.display = 'inline';
    };
    reader.readAsDataURL(file);
  }
};
attachedImgTag.onclick = () => {
  attachedImageBase64 = null;
  attachedImgTag.style.display = 'none';
  imageUpload.value = '';
};

// Send message
sendBtn.onclick = handleSend;
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

function handleSend() {
  const text = promptInput.value.trim();
  if (!text && !attachedImageBase64) return;
  promptInput.value = '';

  if (emptyState && emptyState.parentElement) {
    emptyState.parentElement.removeChild(emptyState);
  }

  appendUserMsg(text, true);
  const aiMsgEl = appendAIMsg('Thinking...', false);

  const chosenModel = currentSettings.customModel || currentSettings.model || popModel.value || 'claude-3.7-sonnet';
  const reqId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  pendingRequests.set(reqId, aiMsgEl);

  let effectiveProvider = currentSettings.provider || 'openrouter';

  let effectiveBaseUrl = currentSettings.baseUrl || PROVIDER_DEFAULTS[currentSettings.provider]?.url || '';
  if (effectiveProvider === 'ollama' && !effectiveBaseUrl) {
    effectiveBaseUrl = 'http://localhost:11434';
  } else if (effectiveProvider === 'ollama_cloud' && !effectiveBaseUrl) {
    effectiveBaseUrl = 'https://ollama.com/api';
  }

  // Build message history from current session
  const activeSession = getActiveSession();
  const history = [];
  if (activeSession.messages) {
    activeSession.messages.slice(-8).forEach(m => {
      history.push({ role: m.role, content: m.content });
    });
  }

  let fullPrompt = text;
  if (activeContext.selection) {
    fullPrompt += '\n\n[Code Context in ' + (activeContext.fileName || 'file') + ']:\n' + activeContext.selection;
  }
  history.push({ role: 'user', content: fullPrompt });

  // Dispatched to Node extension backend
  vscode.postMessage({
    type: 'sendChat',
    reqId: reqId,
    provider: effectiveProvider,
    baseUrl: effectiveBaseUrl,
    apiKey: currentSettings.apiKey,
    model: chosenModel,
    prompt: fullPrompt,
    messages: history,
    imageBase64: attachedImageBase64
  });

  attachedImageBase64 = null;
  attachedImgTag.style.display = 'none';
}

function appendUserMsg(text, saveToHistory = true) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  const bubble = document.createElement('div');
  bubble.className = 'msg-user';
  bubble.textContent = text;
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (saveToHistory) {
    const s = getActiveSession();
    s.messages.push({ role: 'user', content: text });
    saveSessionsToExtension();
  }
}

function appendAIMsg(text = '', saveToHistory = false) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  const bubble = document.createElement('div');
  bubble.className = 'msg-ai';
  bubble.textContent = text;
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (saveToHistory && text) {
    const s = getActiveSession();
    s.messages.push({ role: 'assistant', content: text });
    saveSessionsToExtension();
  }
  return bubble;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(element, rawText) {
  if (!rawText) {
    element.innerHTML = '';
    return;
  }

  const codeBlockRegex = /```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g;
  let html = '';
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    const preText = rawText.substring(lastIndex, match.index);
    html += formatPlainText(preText);

    const lang = match[1] || 'code';
    const code = match[2];
    const encoded = encodeURIComponent(code);

    html += '<div class="code-container">' +
      '<div class="code-top">' +
        '<span>' + escapeHtml(lang) + '</span>' +
        '<div>' +
          '<button class="code-action-btn" onclick="insertCode(\'' + encoded + '\')">Insert</button>' +
          '<button class="code-action-btn" onclick="copyCode(\'' + encoded + '\')">Copy</button>' +
        '</div>' +
      '</div>' +
      '<pre><code>' + escapeHtml(code) + '</code></pre>' +
    '</div>';

    lastIndex = match.index + match[0].length;
  }

  const remaining = rawText.substring(lastIndex);
  html += formatPlainText(remaining);

  element.innerHTML = html;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatPlainText(txt) {
  if (!txt) return '';
  let str = escapeHtml(txt);
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
  str = str.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;">$1</code>');
  str = str.replace(/\n/g, '<br>');
  return str;
}

window.insertCode = function(encoded) {
  const code = decodeURIComponent(encoded);
  vscode.postMessage({ type: 'insertCode', code });
};

window.copyCode = function(encoded) {
  const code = decodeURIComponent(encoded);
  vscode.postMessage({ type: 'copyClipboard', code });
};
