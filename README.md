<div align="center">

<img src="./logo.png" width="140" height="140" alt="VisionX Logo" style="border-radius: 20px;" />

# VisionX IDE
### Autonomous AI and Spatial Developer Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Release: v1.6.6](https://img.shields.io/badge/Release-v1.6.6-brightgreen.svg)](https://github.com/NamanGaonkar/VisionX-IDE/releases/tag/v1.6.6)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-red.svg)]()
[![Aesthetics](https://img.shields.io/badge/Aesthetics-Liquid%20Glass-ff5500.svg)]()
[![AI Engine](https://img.shields.io/badge/AI%20Core-BYOK%20Dynamic%20Discovery-ffd700.svg)]()
[![Extensions](https://img.shields.io/badge/Extensions-Open%20VSX-blue.svg)](https://open-vsx.org/)

VisionX is a high-velocity code editor and developer workspace built on an open-source Code-OSS foundation. Engineered with zero proprietary vendor telemetry, a sleek liquid glass dark obsidian aesthetic, native Bring-Your-Own-Key (BYOK) dynamic AI model discovery, an interactive 360-degree orbital 3D project architecture graph in the bottom panel, macOS-style traffic light window controls, and seamless automatic migration of all VS Code extensions and settings.

</div>

---

## What is New in v1.6.6

- Native GitHub Copilot & VS Code Language Model API Detection: Added direct integration with VS Code's native `vscode.lm` language model architecture. Automatically discovers and communicates with GitHub Copilot Chat models and registered language model providers without manual API configuration.
- Real Model Detection with Intelligent Filtering: Completely purged deceptive hardcoded fallback model lists. Provider scanning now queries actual endpoints and applies strict conversational filtering to strip out embeddings, audio/whisper/tts, moderation, and image models, presenting only verified chat and code generation models.
- Full Ollama Online / Cloud & Local API Architecture: Built dedicated routing for the official Ollama Cloud API (`https://ollama.com/api` and `https://ollama.com/v1`) with Bearer token authentication, as well as local Ollama instances (`http://localhost:11434`), completely eliminating 404 path doubling.
- Complete Removal of Agents Window from Windows Taskbar Jump List: Eliminated the legacy "Agents Window" task and blue hexagonal icon from the Windows taskbar right-click jump list context menu. Patched Electron jump list task generation in `mainImpl.js` so only the clean "New Window" action is registered.
- Neutralized Agent Sessions Workspaces: Prevented agent sessions workspaces from being injected into Windows Jump List tasks or recent documents history.
- Jump List Cache Purge: Automated the cleanup of stale Windows Jump List destination caches in `CustomDestinations` during installation.
- Consolidated Resource Icons: Replaced legacy `sessions.ico` with the official high-resolution VisionX icon across all distribution resources.

---

## What is New in v1.6.5

- Unified Single Model Input in BYOK Settings: Eliminated the confusing duplicate model fields ("Active Recognized Model" dropdown and "Custom Model Override"). Replaced them with a single, direct Model Name field supporting live auto-completion datalist suggestions from scanned endpoints as well as direct text entry.
- Fixed Ollama URL Resolution and Endpoint Normalization: Resolved the double-appended `/api/chat/api/generate` 404 errors by adding intelligent endpoint resolution. Correctly routes to `/api/chat`, `/v1/chat/completions`, or `/api/generate` without URL doubling.
- Transparent Error Reporting: Purged deceptive default fallback models when an endpoint connection fails. Real HTTP error messages (e.g. 404, 401, connection refused) are now shown immediately with diagnostic guidance.
- Host Validation Guidance: Added helpful validation alerting users that `ollama.com` is a web portal, not an API server, guiding users to local `http://localhost:11434` or their private remote host IP.

---

## What is New in v1.6.4

- Comprehensive White and Light Theme Coverage: Fully resolved workbench theme scoping so that light themes (including the newly added VisionX Light Liquid Glass theme) dynamically transform all surfaces: title bar, Command Center, menubar, activity bar, editor tabs, bottom panel, status bar, and dialog popups become pure frosted white and light slate with warm accent highlights.
- Modern 3D Volumetric Spheres: Upgraded the 3D architecture graph from legacy flat gradient blobs to modern PBR volumetric spheres. Features multi-stop lighting, dynamic contact shadows grounding each node, Fresnel edge rim sheen, micro-specular glints, ambient bounce fill, and 3D holographic orbit rings with orbiting photon particles on hover and selection.
- Frosted Glass Pill Badges: File labels in the 3D graph are now rendered on sleek, rounded frosted glass pill badges with dynamic theme contrast, eliminating unreadable floating text.
- VisionX Light Liquid Glass Theme: Built-in signature frosted white light theme with calibrated syntax tokens and subtle liquid borders.

---

## What is New in v1.6.3

- Bottom Panel 3D Project Architecture Graph: Relocated the 3D architecture graph from the sidebar view container directly into the bottom panel bar alongside Terminal, Output, and Problems. Easily toggled via the persistent bottom status bar item or Command Palette.
- Native Visual Studio Code Extensions & Settings Auto-Sync: Engineered an engine-level extension resolver prioritizing `~/.vscode/extensions` so all extensions load instantly out-of-the-box for any user. Automatically mirrors settings, keybindings, snippets, and MCP configurations on startup with zero friction.
- macOS Traffic Light Window Controls Enforcement: Disabled native Windows Window Controls Overlay (WCO) in Electron and forced renderer-level HTML controls with precision circular buttons (Red Close, Yellow Minimize, Green Maximize) matching macOS design standards.
- Permanent Elimination of Corrupt Warnings: Fully neutralized internal engine integrity checks and checksum verification, preventing false "installation appears to be corrupt" dialogs across all processes.
- Liquid Glass Frosted Theme Refinement: Enhanced multi-color syntax highlighting and obsidian surface contrasts.

---

## What is New in v1.6.2

- Permanent Elimination of Corrupt Installation Warnings: Fully neutralized internal engine integrity checks and checksum verification, preventing false "installation appears to be corrupt" dialogs and prompts across all main and renderer processes.
- Precision macOS Traffic Light Window Controls: Overhauled titlebar controls with clean circular traffic lights (Red Close, Yellow Minimize, Green Maximize) with custom borders, subtle glow shadows, and zero icon glyphs, strictly matching macOS specifications.
- VisionX Liquid Glass Theme: Enhanced theme syntax highlighting with vibrant multi-palette accents (electric cyan functions, neon pink keywords, mint teal types, golden amber strings, and lavender variables) against a deep obsidian frosted backdrop.
- Complete Suppression of Profile and Accounts Icons: Purged accounts and profile icons across both titlebar toolbars and activity bars.
- Purged Chat Migration Banners and Tips: Suppressed migration hint notices ("customizations need an update") and auto-accept countdown tips inside the chat panel.
- Total Elimination of Secondary Agents Window: Enforced strict single-window architecture by auto-closing and neutralizing any secondary session window entry points.

---

## What is New in v1.6.1

- Complete Elimination of Agents Window: Fully purged the secondary Agents ("Sessions") window, background services, titlebar widgets, and command bindings. The entire secondary window lifecycle and all invocation paths have been neutralized, ensuring a focused single-window IDE experience.
- Instant Guard for Sessions: Injected automatic window closure guards and disabled agent service preconditions (`chat.agent.enabled: false`) across the Electron main process and renderer.

---

## What is New in v1.6.0

- 360-Degree Orbital 3D Project Architecture Graph: Replaced flat 2D layout with a full 3D orbital space graph. Features spherical coordinate camera rotation (yaw 360 degrees, pitch clamping, zoom), force-directed node positioning, real-time node dragging, inspector cards, and direct context streaming into VisionX Chat.
- Solid Dark Obsidian Theme: Eliminated transparent/acrylic desktop wallpaper pass-through in favor of rich, opaque dark obsidian surfaces (#07090e, #0a0d14, #0c0f18) with subtle 1px structural borders and crisp contrast.
- Minimalist Copilot Chat UI: Streamlined chat interface stripping away bloated prompt chips and mode pills. Restored clean typography, compact message bubbles, an integrated model selector pill, and a focused message composer.
- Enhanced Ollama Online and Remote Cloud API Support: Native Node-level provider execution eliminating browser webview CORS boundaries. Full support for local instances (`http://localhost:11434`), remote Ollama instances, reverse proxies, and token-authenticated cloud endpoints.

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
1. Download the latest release archive (`VisionX-Windows-x64-v1.6.5.zip`) from the Releases section.
2. Extract the archive to any desired directory (e.g., `C:\VisionX` or `%LOCALAPPDATA%\Programs\VisionX`).
3. Run `VisionX.exe`.

### Automated Local Installer (Windows x64)
From the repository root, execute:
```powershell
python scripts/install_local.py
```
This script terminates any running instances, installs VisionX into `%LOCALAPPDATA%\Programs\VisionX`, creates Desktop and Start Menu shortcuts, configures the user PATH environment variable, and links existing Visual Studio Code settings and extensions.

---

## Building from Source

### Prerequisites
- Windows 10/11 x64
- Python 3.10+
- 7-Zip (`7z.exe` on PATH, recommended for fast packaging)
- `rcedit.exe` (on PATH, via Scoop or direct binary)

### Build Steps
```powershell
# 1. Rebuild the VisionX distribution
python scripts/build_visionx.py

# 2. Package standalone zip archive
python scripts/package_release.py

# 3. Install locally
python scripts/install_local.py
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
All Code-OSS source components are subject to their respective upstream licenses.
