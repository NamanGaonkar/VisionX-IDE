<div align="center">

<img src="./logo.png" width="140" height="140" alt="VisionX Logo" style="border-radius: 20px;" />

# VisionX IDE
### Autonomous AI and Spatial Developer Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Release: v1.6.0](https://img.shields.io/badge/Release-v1.6.0-brightgreen.svg)](https://github.com/NamanGaonkar/VisionX-IDE/releases/tag/v1.6.0)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-red.svg)]()
[![Aesthetics](https://img.shields.io/badge/Aesthetics-Solid%20Obsidian-ff5500.svg)]()
[![AI Engine](https://img.shields.io/badge/AI%20Core-BYOK%20Dynamic%20Discovery-ffd700.svg)]()
[![Extensions](https://img.shields.io/badge/Extensions-Open%20VSX-blue.svg)](https://open-vsx.org/)

VisionX is a high-velocity code editor and developer workspace built on an open-source Code-OSS foundation. Engineered with zero proprietary vendor telemetry, a solid dark obsidian interface, native Bring-Your-Own-Key (BYOK) dynamic AI model discovery, an interactive 360-degree orbital 3D project architecture graph, macOS-style traffic light window controls, and full compatibility with the Open VSX extension ecosystem.

</div>

---

## What is New in v1.6.0

- 360-Degree Orbital 3D Project Architecture Graph: Replaced flat 2D layout with a full 3D orbital space graph. Features spherical coordinate camera rotation (yaw 360 degrees, pitch clamping, zoom), force-directed node positioning, real-time node dragging, inspector cards, and direct context streaming into VisionX Chat.
- Solid Dark Obsidian Theme: Eliminated transparent/acrylic desktop wallpaper pass-through in favor of rich, opaque dark obsidian surfaces (#07090e, #0a0d14, #0c0f18) with subtle 1px structural borders and crisp contrast.
- Minimalist Copilot Chat UI: Streamlined chat interface stripping away bloated prompt chips and mode pills. Restored clean typography, compact message bubbles, an integrated model selector pill, and a focused message composer.
- Permanent Integrity Protection: Neutralized false "installation appears to be corrupt" prompts by bypassing internal checksum validation in the engine.
- Enhanced Ollama Online and Remote Cloud API Support: Native Node-level provider execution eliminating browser webview CORS boundaries. Full support for local instances (`http://localhost:11434`), remote Ollama instances, reverse proxies, and token-authenticated cloud endpoints.
- High-Precision macOS Window Controls: Red (Close), Yellow (Minimize), and Green (Maximize) circular controls cleanly ordered and styled across all titlebar contexts.

---

## Features

### Solid Obsidian Interface and Theme Compatibility
- Deep dark obsidian shell with rich background surfaces and amber accents.
- macOS-style traffic light window controls: Red (close), Yellow (minimize), Green (maximize).
- Full theme interoperability: Switching between light, dark, and high-contrast color themes applies dynamically across the entire window, title bar, sidebars, activity bar, and editor tabs.
- Symmetrical rounded geometry, solid non-bleeding title bar, and clean tab transitions.

### 360-Degree Orbital 3D Project Architecture Graph
- Physics-simulated 3D orbital node graph mapping workspace files and cross-file dependencies.
- Full 360-degree rotation with mouse drag, mouse wheel zooming, and reset view controls.
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
1. Download the latest release archive (`VisionX-Windows-x64-v1.6.0.zip`) from the Releases section.
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

## Technical Specifications

| Component | Technology |
|---|---|
| Engine Base | Code-OSS v1.96.2 / Electron v32.2.6 / Chromium v128 / Node.js v20.18.1 |
| Architecture | Windows x64 (PE32+ executable, custom icon, branded manifest) |
| AI Integration | BYOK Multi-Provider Engine (Local Ollama, Remote Ollama, OpenRouter, Anthropic, Gemini, OpenAI, DeepSeek, Groq, Mistral) |
| Spatial Graph | 3D Canvas Orbital Physics Engine with 360-Degree Spherical Viewport |
| Custom Theme | Solid Dark Obsidian Design System |
| Extension API | VS Code Extension API v1.96.2 + Open VSX Marketplace |

---

## Verification and Security

VisionX produces clean executables with no adware or background telemetry:

```powershell
Get-FileHash -Algorithm SHA256 "dist\VisionX-Windows-x64-v1.6.0.zip"
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
