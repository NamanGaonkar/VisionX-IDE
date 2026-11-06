const vscode = acquireVsCodeApi();
const chat = document.getElementById('chat');
const promptInput = document.getElementById('prompt');
const sendBtn = document.getElementById('send-btn');
const openSettings = document.getElementById('open-settings');
const closeSettings = document.getElementById('close-settings');
const settingsModal = document.getElementById('settings-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const scanModelsBtn = document.getElementById('scan-models-btn');
const activeFileBadge = document.getElementById('active-file');
const activeModelBadge = document.getElementById('active-model');
const imgInput = document.getElementById('img-input');
const imgPreview = document.getElementById('image-preview');
const clearImg = document.getElementById('clear-img');
const providerSelect = document.getElementById('set-provider');
const apiKeyInput = document.getElementById('set-api-key');
const modelSelect = document.getElementById('set-model');
const modelStatus = document.getElementById('model-status');
const ollamaGroup = document.getElementById('ollama-url-group');

let currentSettings = {
  provider: 'openrouter',
  model: 'anthropic/claude-3.7-sonnet',
  apiKey: '',
  ollamaUrl: 'http://localhost:11434',
  customModel: '',
  discoveredModels: []
};
let activeContext = { fileName: null, selection: null };
let attachedImageBase64 = null;

vscode.postMessage({ type: 'getSettings' });
setInterval(() => vscode.postMessage({ type: 'getActiveContext' }), 2000);

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'settingsLoaded') {
    currentSettings = msg.settings || currentSettings;
    providerSelect.value = currentSettings.provider || 'openrouter';
    apiKeyInput.value = currentSettings.apiKey || '';
    document.getElementById('set-ollama-url').value = currentSettings.ollamaUrl || 'http://localhost:11434';
    document.getElementById('set-custom-model').value = currentSettings.customModel || '';
    
    toggleOllamaUI();
    if (currentSettings.discoveredModels && currentSettings.discoveredModels.length > 0) {
      populateModelDropdown(currentSettings.discoveredModels, currentSettings.model);
    } else if (currentSettings.apiKey || currentSettings.provider === 'ollama') {
      detectModels();
    }
    updateBadge();
  } else if (msg.type === 'activeContext') {
    activeContext = msg;
    activeFileBadge.textContent = msg.fileName ? msg.fileName : 'Workspace';
  } else if (msg.type === 'runPrompt') {
    promptInput.value = msg.prompt;
    executeAI();
  }
});

function toggleOllamaUI() {
  ollamaGroup.style.display = providerSelect.value === 'ollama' ? 'flex' : 'none';
}

providerSelect.onchange = () => {
  toggleOllamaUI();
  detectModels();
};

apiKeyInput.onblur = () => {
  if (apiKeyInput.value.trim()) {
    detectModels();
  }
};

scanModelsBtn.onclick = detectModels;

async function detectModels() {
  const provider = providerSelect.value;
  const key = apiKeyInput.value.trim();
  const ollamaUrl = document.getElementById('set-ollama-url').value.trim() || 'http://localhost:11434';

  if (!key && provider !== 'ollama') {
    modelStatus.textContent = 'Paste your ' + provider.toUpperCase() + ' API key above to auto-recognize models.';
    return;
  }

  modelStatus.textContent = '🔄 Recognizing models from ' + provider.toUpperCase() + '...';

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
      populateModelDropdown(models, models[0]);
      modelStatus.textContent = '✓ ' + models.length + ' models recognized directly from your API key!';
    } else {
      modelStatus.textContent = 'Connected, but no models found. You can type a model name below.';
    }
  } catch (e) {
    modelStatus.textContent = 'Could not scan automatically: ' + e.message + ' (You can type model manually).';
  }
}

function populateModelDropdown(models, selected) {
  modelSelect.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (m === selected) opt.selected = true;
    modelSelect.appendChild(opt);
  }
}

function updateBadge() {
  const active = document.getElementById('set-custom-model').value.trim() || modelSelect.value || currentSettings.model;
  activeModelBadge.textContent = active.split('/').pop();
}

openSettings.onclick = () => settingsModal.style.display = 'flex';
closeSettings.onclick = () => settingsModal.style.display = 'none';

saveSettingsBtn.onclick = () => {
  currentSettings.provider = providerSelect.value;
  currentSettings.model = modelSelect.value || 'anthropic/claude-3.7-sonnet';
  currentSettings.apiKey = apiKeyInput.value.trim();
  currentSettings.ollamaUrl = document.getElementById('set-ollama-url').value.trim();
  currentSettings.customModel = document.getElementById('set-custom-model').value.trim();
  updateBadge();
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
  const aiMsgEl = appendMessage('Connecting to Neural Core...', 'ai');

  try {
    const chosenModel = currentSettings.customModel || currentSettings.model || modelSelect.value;
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
        userPrompt += '\n\n[Active Selection in ' + (activeContext.fileName || 'file') + ']:\n' + activeContext.selection;
      }
      content.push({ type: 'text', text: userPrompt });

      body = {
        model: chosenModel,
        messages: [
          { role: 'system', content: 'You are VisionX Neural Assistant. Provide clean code and direct solutions.' },
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
      aiMsgEl.innerHTML = '⚠️ <b>API Key required!</b> Click "BYOK Keys" above to enter your key for ' + currentSettings.provider + '.';
      return;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      aiMsgEl.innerHTML = '❌ <b>API Error:</b> ' + err;
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
    block.className = 'code-block';
    block.innerHTML = '<div class="code-header"><span>' + escapeHtml(lang) + '</span><div><button class="copy-btn">Copy</button><button class="apply-btn">Insert in Editor</button></div></div><pre><code>' + escapeHtml(code) + '</code></pre>';
    block.querySelector('.copy-btn').onclick = () => vscode.postMessage({ type: 'copyClipboard', code: code });
    block.querySelector('.apply-btn').onclick = () => vscode.postMessage({ type: 'insertCode', code: code });
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

  chat.scrollTop = chat.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
