const vscode = acquireVsCodeApi();

const chatMessages = document.getElementById('chat-messages');
const emptyState = document.getElementById('empty-state');
const promptInput = document.getElementById('copilot-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const refreshChatBtn = document.getElementById('refresh-chat-btn');
const importVscodeBtn = document.getElementById('import-vscode-btn');
const bannerImportLink = document.getElementById('banner-import-link');

const modelPillBtn = document.getElementById('model-pill-btn');
const modelPillText = document.getElementById('model-pill-text');
const modelPopover = document.getElementById('model-popover');
const popProvider = document.getElementById('pop-provider');
const popApiKey = document.getElementById('pop-api-key');
const popModel = document.getElementById('pop-model');
const popCustomModel = document.getElementById('pop-custom-model');
const popOllamaRow = document.getElementById('pop-ollama-row');
const popOllamaUrl = document.getElementById('pop-ollama-url');
const popStatus = document.getElementById('pop-status');
const popSaveBtn = document.getElementById('pop-save-btn');
const popCancelBtn = document.getElementById('pop-cancel-btn');

const imageUpload = document.getElementById('image-upload');
const attachedImgTag = document.getElementById('attached-img-tag');
const activeContextLabel = document.getElementById('active-context-label');

let currentSettings = {
  provider: 'openrouter',
  model: '',
  apiKey: '',
  ollamaUrl: 'http://localhost:11434',
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
    currentSettings = msg.settings || currentSettings;
    popProvider.value = currentSettings.provider || 'openrouter';
    popApiKey.value = currentSettings.apiKey || '';
    popOllamaUrl.value = currentSettings.ollamaUrl || 'http://localhost:11434';
    popCustomModel.value = currentSettings.customModel || '';
    toggleOllama();

    if (currentSettings.discoveredModels && currentSettings.discoveredModels.length > 0) {
      populateModelDropdown(currentSettings.discoveredModels, currentSettings.model);
    } else if (currentSettings.apiKey || currentSettings.provider === 'ollama') {
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

function toggleOllama() {
  popOllamaRow.style.display = popProvider.value === 'ollama' ? 'flex' : 'none';
}

popProvider.onchange = () => {
  toggleOllama();
  detectModels();
};

popApiKey.onblur = () => {
  if (popApiKey.value.trim()) {
    detectModels();
  }
};

modelPillBtn.onclick = () => {
  const isShown = modelPopover.style.display === 'flex';
  modelPopover.style.display = isShown ? 'none' : 'flex';
};

popCancelBtn.onclick = () => {
  modelPopover.style.display = 'none';
};

popSaveBtn.onclick = () => {
  currentSettings.provider = popProvider.value;
  currentSettings.model = popModel.value || 'anthropic/claude-3.7-sonnet';
  currentSettings.apiKey = popApiKey.value.trim();
  currentSettings.ollamaUrl = popOllamaUrl.value.trim();
  currentSettings.customModel = popCustomModel.value.trim();
  updatePill();
  vscode.postMessage({ type: 'saveSettings', settings: currentSettings });
  modelPopover.style.display = 'none';
};

function updatePill() {
  const active = currentSettings.customModel || currentSettings.model;
  if (!currentSettings.apiKey && currentSettings.provider !== 'ollama') {
    modelPillText.textContent = 'VisionX | Connect Model';
  } else if (active) {
    const name = active.split('/').pop();
    modelPillText.textContent = 'VisionX | ' + name;
  } else {
    modelPillText.textContent = 'VisionX | Select Model';
  }
}

async function detectModels() {
  const provider = popProvider.value;
  const key = popApiKey.value.trim();
  const ollamaUrl = popOllamaUrl.value.trim() || 'http://localhost:11434';

  if (!key && provider !== 'ollama') {
    popStatus.textContent = 'Paste your API key above to automatically recognize models.';
    return;
  }

  popStatus.textContent = 'Checking ' + provider.toUpperCase() + ' models...';

  try {
    let models = [];
    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map(m => m.id);
      }
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map(m => m.id).filter(id => id.includes('gpt') || id.includes('o1') || id.includes('o3'));
      }
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (res.ok) {
        const data = await res.json();
        models = (data.data || []).map(m => m.id);
      }
    } else if (provider === 'deepseek') {
      models = ['deepseek-chat', 'deepseek-reasoner'];
    } else if (provider === 'anthropic') {
      models = ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'];
    } else if (provider === 'gemini') {
      models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    } else if (provider === 'ollama') {
      const res = await fetch(ollamaUrl + '/api/tags');
      if (res.ok) {
        const data = await res.json();
        models = (data.models || []).map(m => m.name);
      }
    }

    if (models && models.length > 0) {
      currentSettings.discoveredModels = models;
      if (!currentSettings.model || !models.includes(currentSettings.model)) {
        currentSettings.model = models[0];
      }
      populateModelDropdown(models, currentSettings.model);
      updatePill();
      popStatus.textContent = '✓ ' + models.length + ' models recognized from key.';
    } else {
      popStatus.textContent = 'No models returned. You can enter an override below.';
    }
  } catch (e) {
    popStatus.textContent = 'Note: ' + e.message;
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

// Import VS Code Handlers
importVscodeBtn.onclick = () => vscode.postMessage({ type: 'importVSCodeTrigger' });
if (bannerImportLink) {
  bannerImportLink.onclick = (e) => {
    e.preventDefault();
    vscode.postMessage({ type: 'importVSCodeTrigger' });
  };
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
    const chosenModel = currentSettings.customModel || currentSettings.model || popModel.value;
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
        userPrompt += '\n\n[Context: ' + (activeContext.fileName || 'active file') + ']:\n' + activeContext.selection;
      }
      content.push({ type: 'text', text: userPrompt });

      body = {
        model: chosenModel,
        messages: [
          { role: 'system', content: 'You are VisionX Copilot, a high-caliber AI programming companion. Be concise, accurate, and provide clean code.' },
          { role: 'user', content: content }
        ]
      };
    } else if (currentSettings.provider === 'ollama') {
      endpoint = (currentSettings.ollamaUrl || 'http://localhost:11434') + '/api/generate';
      body = {
        model: chosenModel,
        prompt: text + (activeContext.selection ? '\n\nCode:\n' + activeContext.selection : ''),
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
          { role: 'system', content: 'You are VisionX Copilot. Deliver concise and accurate code.' },
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
      aiMsgEl.innerHTML = 'Please click the model pill below and enter your API key for ' + currentSettings.provider.toUpperCase() + '.';
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
      reply = data.response;
    } else if (currentSettings.provider === 'anthropic') {
      reply = data.content && data.content[0] ? data.content[0].text : '';
    } else {
      reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
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

function appendAIMsg(text) {
  const row = document.createElement('div');
  row.className = 'msg-row';
  const bubble = document.createElement('div');
  bubble.className = 'msg-ai';
  bubble.textContent = text;
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

function renderMarkdown(el, text) {
  el.innerHTML = '';
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index).trim();
      if (plainText) {
        const p = document.createElement('div');
        p.innerHTML = escapeHtml(plainText).replace(/\n/g, '<br>');
        el.appendChild(p);
      }
    }

    const blockContent = match[1].trim();
    const firstNewline = blockContent.indexOf('\n');
    let lang = 'code';
    let code = blockContent;
    if (firstNewline !== -1) {
      lang = blockContent.slice(0, firstNewline).trim() || 'code';
      code = blockContent.slice(firstNewline + 1);
    }

    const block = document.createElement('div');
    block.className = 'code-container';
    block.innerHTML = '<div class="code-top"><span>' + escapeHtml(lang) + '</span><div><button class="code-action-btn copy-btn">Copy</button><button class="code-action-btn insert-btn">Insert</button></div></div><pre><code>' + escapeHtml(code) + '</code></pre>';
    block.querySelector('.copy-btn').onclick = () => vscode.postMessage({ type: 'copyClipboard', code: code });
    block.querySelector('.insert-btn').onclick = () => vscode.postMessage({ type: 'insertCode', code: code });
    el.appendChild(block);

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      const p = document.createElement('div');
      p.innerHTML = escapeHtml(remaining).replace(/\n/g, '<br>');
      el.appendChild(p);
    }
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
