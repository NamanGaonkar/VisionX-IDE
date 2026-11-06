<div align="center">

<img src="./logo.png" width="140" height="140" alt="VisionX Logo" style="border-radius: 20px;" />

# VisionX IDE
### Autonomous AI and Spatial Developer Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-red.svg)]()
[![Aesthetics](https://img.shields.io/badge/Aesthetics-Liquid%20Glass-ff5500.svg)]()
[![AI Engine](https://img.shields.io/badge/AI%20Core-BYOK%20Dynamic%20Discovery-ffd700.svg)]()
[![Extensions](https://img.shields.io/badge/Extensions-Open%20VSX-blue.svg)](https://open-vsx.org/)

VisionX is a high-velocity code editor and developer workspace built on an open-source Code-OSS foundation. Engineered with zero proprietary vendor telemetry, a symmetrical Liquid Glass interface, native Bring-Your-Own-Key (BYOK) dynamic AI model discovery, and full compatibility with the Open VSX extension ecosystem.

</div>

---

## Features

### Liquid Glass Interface and Theme Compatibility
- Deep dark liquid glass shell with obsidian surfaces and warm amber accents.
- Full theme interoperability: Switching between light, dark, and high-contrast color themes applies dynamically across the entire window, title bar, sidebars, activity bar, and editor tabs.
- Symmetrical rounded geometry, non-bleeding solid title bar, and smooth tab transitions.

### VisionX Chat (Native Copilot Architecture)
- Integrated Chat sidebar matching the official native interface structure.
- Dynamic BYOK discovery: Connect any API key (OpenRouter, OpenAI, Anthropic, Google Gemini, DeepSeek, Groq) or local Ollama instance (`http://localhost:11434`).
- Automatic model discovery: Available models are queried and populated directly from provider endpoints (`/v1/models` and `/api/tags`) upon key entry.
- Direct editor integration: Trigger explanations, inline refactoring, and automated bug fixing directly from code selections.

### Automatic Migration from Visual Studio Code
- First-run detection: Prompts upon initial launch to automatically import existing configurations from Visual Studio Code.
- Imports `settings.json`, `keybindings.json`, and user snippets from `%APPDATA%\Code\User` directly into `%APPDATA%\VisionX\User`.
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
1. Download the latest release archive (`VisionX-Windows-x64-v1.2.0.zip`) from the Releases section.
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
2. Open the Chat panel from the Activity Bar on the left.
3. Click the model pill in the input bar or open settings.
4. Select your provider (OpenRouter, OpenAI, Anthropic, Gemini, DeepSeek, Groq, or Ollama).
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
│   └── ai-assistant/      # VisionX Chat extension (BYOK and dynamic discovery)
├── scripts/
│   ├── build_visionx.py   # Assembles dist, patches product.json, sets PE icons
│   ├── install_local.py   # Installs to AppData, creates shortcuts, registers PATH
│   └── package_release.py # Packages standalone Windows release archive
├── logo.png               # Official high-resolution VisionX identity logo
└── README.md
```

---

## License
This project is open-source software licensed under the [MIT License](LICENSE).
Code-OSS engine copyright respective contributors. Custom branding, Liquid Glass Theme, and VisionX Chat are maintained by the VisionX Contributors.
