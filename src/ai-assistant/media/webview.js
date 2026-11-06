const vscode = acquireVsCodeApi();

const chatMessages = document.getElementById('chat-messages');
const emptyState = document.getElementById('empty-state');
const promptInput = document.getElementById('copilot-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const refreshChatBtn = document.getElementById('refresh-chat-btn');
const headerSettingsBtn = document.getElementById('header-settings-btn');

const modelPillBtn = document.getElementById('model-pill-btn');
const modelPillText = document.getElementById('model-pill-text');
const modelPopover = document.getElementById('model-popover');
const popProvider = document.getElementById('pop-provider');
const popBaseUrl = document.getElementById('pop-base-url');
const popApiKey = document.getElementById('pop-api-key');
const popModel = document.getElementById('pop-model');
const popCustomModel = document.getElementById('pop-custom-model');
const popStatus = document.getElementById('pop-status');
const popSaveBtn = document.getElementById('pop-save-btn');
const popCancelBtn = document.getElementById('pop-cancel-btn');

const imageUpload = document.getElementById('image-upload');
const attachedImgTag = document.getElementById('attached-img-tag');
const activeContextLabel = document.getElementById('active-context-label');

const PROVIDER_DEFAULTS = {
  openrouter: { url: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.7-sonnet' },
  custom:     { url: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
  openai:     { url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  anthropic:  { url: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-7-sonnet-20250219' },
  gemini:     { url: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.5-flash' },
  deepseek:   { url: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  groq:       { url: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  mistral:    { url: 'https://api.mistral.ai/v1', defaultModel: 'codestral-latest' },
  together:   { url: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
  perplexity: { url: 'https://api.perplexity.ai', defaultModel: 'sonar-pro' },
  cerebras:   { url: 'https://api.cerebras.ai/v1', defaultModel: 'llama3.3-70b' },
  fireworks:  { url: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  cohere:     { url: 'https://api.cohere.ai/v1', defaultModel: 'command-r-plus' },
  deepinfra:  { url: 'https://api.deepinfra.com/v1/openai', defaultModel: 'meta-llama/Meta-Llama-3.3-70B-Instruct' },
  sambanova:  { url: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.3-70B-Instruct' },
  hyperbolic: { url: 'https://api.hyperbolic.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct' },
  novita:     { url: 'https://api.novita.ai/v3/openai', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
  ollama:     { url: 'http://localhost:11434', defaultModel: 'llama3.3' },
  lmstudio:   { url: 'http://localhost:1234/v1', defaultModel: 'local-model' }
};

let currentSettings = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'Claude 3.7 Sonnet',
  customModel: '',
  discoveredModels: []
};

let activeContext = { fileName: null, selection: null };
let attachedImageBase64 = null;

// Initial sync with extension
vscode.postMessage({ type: 'getSettings' });
setInterval(() => vscode.postMessage({ type: 'getActiveContext' }), 2000);

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'settingsLoaded') {
    if (msg.settings) {
      currentSettings = Object.assign(currentSettings, msg.settings);
    }
    popProvider.value = currentSettings.provider || 'openrouter';
    popBaseUrl.value = currentSettings.baseUrl || PROVIDER_DEFAULTS[currentSettings.provider]?.url || '';
    popApiKey.value = currentSettings.apiKey || '';
    popCustomModel.value = currentSettings.customModel || '';

    if (currentSettings.discoveredModels && currentSettings.discoveredModels.length > 0) {
      populateModelDropdown(currentSettings.discoveredModels, currentSettings.model);
    } else if (currentSettings.apiKey || currentSettings.provider === 'ollama' || currentSettings.provider === 'lmstudio') {
      detectModels();
    }
    updatePill();
  } else if (msg.type === 'activeContext') {
    activeContext = msg;
    if (msg.fileName) {
      activeContextLabel.textContent = msg.fileName + (msg.selection ? ' (selected)' : '');
    } else {
      activeContextLabel.textContent = 'Ready';
    }
  } else if (msg.type === 'runPrompt') {
    promptInput.value = msg.prompt;
    handleSend();
  }
});

popProvider.onchange = () => {
  const prov = popProvider.value;
  if (PROVIDER_DEFAULTS[prov]) {
    popBaseUrl.value = PROVIDER_DEFAULTS[prov].url;
  }
  detectModels();
};

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

popCancelBtn.onclick = () => {
  modelPopover.style.display = 'none';
};

popSaveBtn.onclick = () => {
  currentSettings.provider = popProvider.value;
  currentSettings.baseUrl = popBaseUrl.value.trim() || PROVIDER_DEFAULTS[currentSettings.provider]?.url || '';
  currentSettings.apiKey = popApiKey.value.trim();
  currentSettings.model = popModel.value || currentSettings.model;
  currentSettings.customModel = popCustomModel.value.trim();
  updatePill();
  vscode.postMessage({ type: 'saveSettings', settings: currentSettings });
  modelPopover.style.display = 'none';
};

function updatePill() {
  const active = currentSettings.customModel || currentSettings.model || 'Claude 3.7 Sonnet';
  const name = active.split('/').pop().replace(/-20\d\d\d\d\d\d/g, '');
  modelPillText.textContent = name;
}

async function detectModels() {
  const provider = popProvider.value;
  const baseUrl = (popBaseUrl.value.trim() || PROVIDER_DEFAULTS[provider]?.url || '').replace(/\/+$/, '');
  const key = popApiKey.value.trim();

  if (!key && provider !== 'ollama' && provider !== 'lmstudio') {
    popStatus.textContent = 'Enter API key above to discover models.';
    return;
  }

  popStatus.textContent = 'Discovering models from ' + provider.toUpperCase() + '...';

  try {
    let models = [];
    if (provider === 'ollama') {
      const res = await fetch(baseUrl + '/api/tags');
      if (res.ok) {
        const data = await res.json();
        models = (data.models || []).map(m => m.name);
      }
    } else if (provider === 'anthropic') {
      models = ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
    } else if (provider === 'gemini') {
      models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    } else {
      // Standard OpenAI-compatible /v1/models endpoint (Works for OpenRouter, OpenAI, Groq, Together, DeepSeek, Mistral, Cerebras, Fireworks, Cohere, LM Studio, Custom, etc.)
      const headers = { 'Authorization': 'Bearer ' + key };
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://visionx.dev';
        headers['X-Title'] = 'VisionX';
      }
      const res = await fetch(baseUrl + '/models', { headers });
      if (res.ok) {
        const data = await res.json();
        const rawList = data.data || data.models || [];
        models = rawList.map(m => typeof m === 'string' ? m : (m.id || m.name)).filter(Boolean);
      }
    }

    if (models && models.length > 0) {
      currentSettings.discoveredModels = models;
      if (!currentSettings.model || !models.includes(currentSettings.model)) {
        currentSettings.model = models[0];
      }
      populateModelDropdown(models, currentSettings.model);
      updatePill();
      popStatus.textContent = models.length + ' models recognized successfully.';
    } else {
      popStatus.textContent = 'No models returned. You can enter an override below.';
    }
  } catch (e) {
    popStatus.textContent = 'Status: ' + e.message;
  }
}

function populateModelDropdown(models, selected) {
  popModel.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (m === selected) opt.selected = true;
    popModel.appendChild(opt);
  }
}

// Clear Chat / New Chat
newChatBtn.onclick = clearChat;
refreshChatBtn.onclick = clearChat;

function clearChat() {
  chatMessages.innerHTML = '';
  if (emptyState) {
    chatMessages.appendChild(emptyState);
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

// Send on Enter
sendBtn.onclick = handleSend;
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

async function handleSend() {
  const text = promptInput.value.trim();
  if (!text && !attachedImageBase64) return;
  promptInput.value = '';

  if (emptyState && emptyState.parentElement) {
    emptyState.parentElement.removeChild(emptyState);
  }

  appendUserMsg(text);
  const aiMsgEl = appendAIMsg('Thinking...');

  try {
    const chosenModel = currentSettings.customModel || currentSettings.model || popModel.value || 'claude-3.7-sonnet';
    const baseUrl = (currentSettings.baseUrl || PROVIDER_DEFAULTS[currentSettings.provider]?.url || '').replace(/\/+$/, '');
    let endpoint = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    if (currentSettings.provider === 'ollama') {
      endpoint = baseUrl + '/api/generate';
      body = {
        model: chosenModel,
        prompt: text + (activeContext.selection ? '\n\nCode Context (' + (activeContext.fileName || 'file') + '):\n' + activeContext.selection : ''),
        stream: false
      };
    } else if (currentSettings.provider === 'anthropic') {
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = currentSettings.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: chosenModel,
        max_tokens: 4096,
        messages: [{ role: 'user', content: text + (activeContext.selection ? '\n\nCode Context:\n' + activeContext.selection : '') }]
      };
    } else if (currentSettings.provider === 'gemini') {
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + chosenModel + ':generateContent?key=' + currentSettings.apiKey;
      body = {
        contents: [{ parts: [{ text: text + (activeContext.selection ? '\n\nCode Context:\n' + activeContext.selection : '') }] }]
      };
    } else {
      // Universal OpenAI-compatible endpoint
      endpoint = baseUrl + '/chat/completions';
      if (currentSettings.apiKey) {
        headers['Authorization'] = 'Bearer ' + currentSettings.apiKey;
      }
      if (currentSettings.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://visionx.dev';
        headers['X-Title'] = 'VisionX';
      }

      const userContent = [];
      if (attachedImageBase64) {
        userContent.push({ type: 'image_url', image_url: { url: attachedImageBase64 } });
      }
      let promptWithContext = text;
      if (activeContext.selection) {
        promptWithContext += '\n\n[Active Code Context in ' + (activeContext.fileName || 'editor') + ']:\n' + activeContext.selection;
      }
      userContent.push({ type: 'text', text: promptWithContext });

      body = {
        model: chosenModel,
        messages: [
          { role: 'system', content: 'You are VisionX, an advanced autonomous coding companion. Provide precise, clean, idiomatic code solutions without fluff.' },
          { role: 'user', content: userContent }
        ]
      };
    }

    if (!currentSettings.apiKey && currentSettings.provider !== 'ollama' && currentSettings.provider !== 'lmstudio') {
      aiMsgEl.innerHTML = 'Please click the model pill below and enter your API key to activate AI responses.';
      return;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      aiMsgEl.innerHTML = 'Error: ' + err;
      return;
    }

    const data = await res.json();
    let reply = '';
    if (currentSettings.provider === 'ollama') {
      reply = data.response || '';
    } else if (currentSettings.provider === 'anthropic') {
      reply = data.content && data.content[0] ? data.content[0].text : '';
    } else if (currentSettings.provider === 'gemini') {
      reply = data.candidates && data.candidates[0]?.content?.parts?.[0]?.text || '';
    } else {
      reply = data.choices && data.choices[0]?.message?.content || '';
    }

    renderMarkdown(aiMsgEl, reply);
  } catch (e) {
    aiMsgEl.innerHTML = 'Connection error: ' + e.message;
  }
}

function appendUserMsg(text) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  const bubble = document.createElement('div');
  bubble.className = 'msg-user';
  bubble.textContent = text;
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendAIMsg(initialText) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  const bubble = document.createElement('div');
  bubble.className = 'msg-ai';
  bubble.textContent = initialText;
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

function renderMarkdown(element, mdText) {
  element.innerHTML = '';
  const lines = mdText.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (inCode) {
        // End code block
        const container = document.createElement('div');
        container.className = 'code-container';

        const top = document.createElement('div');
        top.className = 'code-top';
        top.innerHTML = '<span>' + (codeLang || 'code') + '</span>';

        const actions = document.createElement('div');
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-action-btn';
        copyBtn.textContent = 'Copy';
        const codeString = codeBuffer.join('\n');
        copyBtn.onclick = () => vscode.postMessage({ type: 'copyClipboard', code: codeString });

        const insertBtn = document.createElement('button');
        insertBtn.className = 'code-action-btn';
        insertBtn.textContent = 'Insert';
        insertBtn.onclick = () => vscode.postMessage({ type: 'insertCode', code: codeString });

        actions.appendChild(copyBtn);
        actions.appendChild(insertBtn);
        top.appendChild(actions);

        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeString;
        pre.appendChild(code);

        container.appendChild(top);
        container.appendChild(pre);
        element.appendChild(container);

        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
        codeLang = line.replace('```', '').trim();
      }
    } else if (inCode) {
      codeBuffer.push(line);
    } else {
      if (line.trim()) {
        const p = document.createElement('p');
        p.style.margin = '4px 0';
        p.textContent = line;
        element.appendChild(p);
      }
    }
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}
