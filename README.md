<div align="center">

<img src="./logo.png" width="140" height="140" alt="VisionX Logo" style="border-radius: 20px;" />

# VisionX IDE
### Autonomous AI and Spatial Developer Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Release: v1.4.0](https://img.shields.io/badge/Release-v1.4.0-brightgreen.svg)](https://github.com/NamanGaonkar/VisionX-IDE/releases/tag/v1.4.0)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-red.svg)]()
[![Aesthetics](https://img.shields.io/badge/Aesthetics-Liquid%20Glass-ff5500.svg)]()
[![AI Engine](https://img.shields.io/badge/AI%20Core-BYOK%20Dynamic%20Discovery-ffd700.svg)]()
[![Extensions](https://img.shields.io/badge/Extensions-Open%20VSX-blue.svg)](https://open-vsx.org/)

VisionX is a high-velocity code editor and developer workspace built on an open-source Code-OSS foundation. Engineered with zero proprietary vendor telemetry, a symmetrical Liquid Glass interface, native Bring-Your-Own-Key (BYOK) dynamic AI model discovery, interactive 2D project architecture dependency visualization, macOS-style window controls, and full compatibility with the Open VSX extension ecosystem.

</div>

---

## What is New in v1.4.0

- Direct Titlebar Chat Toggle: Chat toggle button is integrated directly into the top Command Center title bar beside search, giving instantaneous one-click access anywhere in the IDE.
- 2D Project Architecture Graph: Interactive dependency visualizer that scans project files, maps out cross-file imports and relations, supports pan/zoom, node dragging, file inspection, and one-click context transfer directly into VisionX Chat.
- Native Multi-Session Management: Manage multiple distinct conversation threads in Chat with session switching, persistence across restarts, and thread deletion.
- macOS-Style Traffic Light Controls: Sleek circular window controls (Red close, Yellow minimize, Green maximize) with smooth hover scaling and glow effects.
- Agent Window and Setup Dialog Branding: Rebranded the Agent ("Sessions") window and setup dialogs with the official glowing VisionX logo, replacing legacy ribbon/bracket glyphs and removing third-party editor strings across OAuth and title bars.
- Zero Modification Warnings: Fully verified internal digests and suppressed false tamper notifications for a clean, warning-free launch experience.

---

## Features

### Liquid Glass Interface and Theme Compatibility
- Deep dark liquid glass shell with obsidian surfaces and warm amber accents.
- macOS-style traffic light window controls: Red (close), Yellow (minimize), Green (maximize).
- Full theme interoperability: Switching between light, dark, and high-contrast color themes applies dynamically across the entire window, title bar, sidebars, activity bar, and editor tabs.
- Symmetrical rounded geometry, non-bleeding solid title bar, and smooth tab transitions.

### 2D Project Architecture and Dependency Graph
- Interactive physics-simulated node graph mapping workspace files and cross-file dependencies.
- Visual file-type color coding (Python, JavaScript, TypeScript, JSON, CSS, Markdown, etc.).
- Search and filter files by name and type.
- Floating inspector card with file metadata, outgoing imports, and incoming references.
- Deep integration with Chat: Click "Ask VisionX Chat About File" to query architecture and implementation details with instant context awareness.

### VisionX Chat (Native Copilot Architecture)
- Direct top Command Center title bar button for one-click access.
- Multi-session drawer: Create new sessions, switch between active sessions, and preserve full chat history across reloads.
- Dynamic BYOK discovery: Connect any API key (OpenRouter, OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Mistral, Together, Perplexity, Cerebras, Fireworks, Cohere, DeepInfra, SambaNova, Hyperbolic, Novita) or local instances (Ollama, LM Studio).
- Automatic model discovery: Available models are queried and populated directly from provider endpoints (`/v1/models` and `/api/tags`) upon key entry.
- Direct editor integration: Trigger explanations, inline refactoring, and automated bug fixing directly from code selections.

### Automatic Migration from Visual Studio Code
- First-run detection: Prompts upon initial launch to automatically import existing configurations from Visual Studio Code.
- Imports `settings.json`, `keybindings.json`, user snippets, `mcp.json`, and extensions directly into VisionX.
- Manual import command: Run `VisionX: Import Settings & Keybindings from Visual Studio Code` from the Command Palette (`Ctrl+Shift+P`) at any time.

### Extension Ecosystem
- Configured out of the box with the Open VSX Registry (Eclipse Foundation).
- Install language servers, linters, debuggers, formatters, and themes directly from the Extensions view (`Ctrl+Shift+X`).

### Privacy and Telemetry
- All corporate tracking, diagnostic telemetry, and crash uploaders have been completely disabled.
- AI prompts and API credentials connect directly to your chosen endpoints without intermediary proxy servers.

---

## Installation and Quick Start

### Standalone Release (Windows x64)
1. Download the latest release archive (`VisionX-Windows-x64-v1.4.0.zip`) from the Releases section.
2. Extract the archive to your preferred folder.
3. Run `VisionX.exe`.

### Local Installation via Source
```powershell
# Clone the repository
git clone https://github.com/NamanGaonkar/VisionX-IDE.git
cd VisionX-IDE

# Build the distribution engine
python scripts/build_visionx.py

# Install to %LOCALAPPDATA%\Programs\VisionX and configure shortcuts + PATH
python scripts/install_local.py
```

### Launching from Terminal
Once installed, launch VisionX from PowerShell or Command Prompt:
```powershell
visionx .
```

---

## Configuration

### Configuring BYOK AI Models
1. Launch VisionX.
2. Open the Chat panel from the top Command Center button or Activity Bar on the left.
3. Click the model pill in the input bar or open settings.
4. Select your provider (OpenRouter, OpenAI, Anthropic, Gemini, DeepSeek, Groq, Ollama, etc.).
5. Paste your API key. Authorized models are discovered and populated automatically.

---

## Repository Structure

```
VisionX-IDE/
├── build/                 # Prebuilt engine assets and multi-resolution icons
│   └── icons/             # visionx.ico and high-resolution icons
├── src/
│   ├── branding/          # Official VisionX identity vector assets
│   ├── theme/             # VisionX Liquid Glass theme extension
│   └── ai-assistant/      # VisionX Chat & 2D Project Architecture extension
├── scripts/
│   ├── build_visionx.py   # Assembles dist, patches product.json, injects CSS, sets PE icons
│   ├── install_local.py   # Installs to AppData, creates shortcuts, registers PATH
│   └── package_release.py # Packages standalone Windows release archive
├── logo.png               # Official high-resolution VisionX identity logo
└── README.md
```

---

## License
This project is open-source software licensed under the [MIT License](LICENSE).
Code-OSS engine copyright respective contributors. Custom branding, Liquid Glass Theme, VisionX Chat, and Project Architecture Graph are maintained by the VisionX Contributors.
