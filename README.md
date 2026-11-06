<div align="center">

<img src="./logo.png" width="160" height="160" alt="VisionX Logo" style="border-radius: 24px; box-shadow: 0 0 35px rgba(255, 85, 0, 0.5);" />

# VisionX IDE
### Next-Generation Autonomous AI & Spatial Developer Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-red.svg)]()
[![Theme](https://img.shields.io/badge/Aesthetics-Liquid%20Glass-ff5500.svg)]()
[![AI](https://img.shields.io/badge/AI%20Core-BYOK%20All%20Models-ffd700.svg)]()
[![Marketplace](https://img.shields.io/badge/Extensions-Open%20VSX-blue.svg)](https://open-vsx.org/)

**VisionX** is a sovereign, high-velocity IDE built for the multi-modal agentic era. Engineered on an open-source Code-OSS foundation, completely rebranded with zero proprietary locks, a bespoke **Liquid Glass** cyberpunk aesthetic, native Bring-Your-Own-Key (BYOK) AI engine supporting every major foundation model, and full Open VSX plugin registry compatibility.

---

</div>

## 🌟 Signature Features

### 1. 💎 Liquid Glass Neo-Cyberpunk Aesthetics
- **Bespoke Theme:** Deep obsidian translucent glass surfaces (`#080a10`), neon amber/crimson glowing accents (`#ff5500` & `#ffd700`), and liquid glass borders.
- **Glowing Elements:** Neon glowing editor cursor, smooth line-highlight glow, active tab halos, and custom scrollbars.
- **Glassmorphic UI Shell:** Translucent title bar, activity bar, and status bar with native backdrop blur.

### 2. 🧠 VisionX AI Neural Core (BYOK)
No subscriptions, no artificial rate limits. Plug your own keys or run locally:
- **OpenRouter Support:** Single-key access to 300+ models (Claude 3.7 Sonnet, DeepSeek R1, GPT-4o, Llama 3.3 70B, Qwen 2.5 Coder, Gemini 2.5).
- **Direct Cloud Providers:** Anthropic, OpenAI, Google Gemini, DeepSeek, Groq, Mistral.
- **100% Local / Offline:** Auto-detects local **Ollama** (`http://localhost:11434`) for zero-cost, private offline coding.
- **In-Editor Context:** Instant selection awareness, code refactoring, bug fixes, and 1-click diff application directly into the active editor.

### 3. 📷 Visual & Multi-Modal Coding
- Attach UI mockups, screenshots, or whiteboard architecture diagrams directly into the chat prompt.
- VisionX analyzes design tokens, layout hierarchy, and active code to synthesize matching React, Vue, Tailwind, or Flutter components.

### 4. 🧩 Full Extension Marketplace Compatibility
- Pre-configured with the **Open VSX Registry** (Eclipse Foundation).
- Install any plugin (Python, Rust Analyzer, ESLint, Prettier, GitLens, Docker, Vim, etc.) seamlessly just like standard VS Code.

### 5. 🛡️ Absolute Privacy & Zero Telemetry
- All corporate Microsoft telemetry, tracking, and diagnostics have been completely stripped out.
- Your code and keys never touch third-party proxy servers.

---

## 🚀 Quick Start & Installation

### Option 1: Automatic Local Install
If you have cloned the repo:
```bash
# Build the distribution
python scripts/build_visionx.py

# Install to %LOCALAPPDATA%\Programs\VisionX and configure shortcuts + PATH
python scripts/install_local.py
```

### Option 2: Launch from Terminal
Once installed, launch VisionX from any PowerShell or Command Prompt terminal:
```bash
visionx .
```

---

## ⚙️ Configuring BYOK AI Models

1. Launch **VisionX**.
2. Click the glowing **VisionX V** icon in the left Activity Bar to open **VisionX Intelligence**.
3. Click the **⚙ (Settings)** button in the top right of the panel.
4. Select your provider (**OpenRouter**, **Anthropic**, **OpenAI**, **DeepSeek**, **Groq**, or **Ollama**).
5. Paste your API key and save.

---

## 🛠️ Repository Architecture

```
VisionX-IDE/
├── build/                 # Generated multi-size icons and base assets
│   └── icons/             # visionx.ico and high-res PNG icons
├── src/
│   ├── theme/             # Official VisionX Liquid Glass Theme extension
│   └── ai-assistant/      # VisionX AI Core extension (BYOK + Webview)
├── scripts/
│   ├── build_visionx.py   # Assembles dist, patches product.json, sets PE icons
│   ├── install_local.py   # Installs to AppData, creates shortcuts, registers PATH
│   └── package_release.py # Packages standalone Windows release zip
├── logo.png               # Official high-res VisionX identity logo
└── README.md
```

---

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).
Code-OSS engine &copy; respective contributors. Custom branding, Liquid Glass Theme, and VisionX AI Core are maintained by the VisionX Community.
