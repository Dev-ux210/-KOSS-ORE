# ORE — Kaju Open Source

<div align="center">

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)
![Release](https://img.shields.io/badge/release-v1.0.0-purple.svg)
![AI Engine](https://img.shields.io/badge/AI-Ollama%20%7C%20Gemini%20%7C%20OpenAI-orange.svg)

**A self-hostable, local AI-powered knowledge repository & study assistant for academic literature and research documents.**

[Download App](#-instant-download--releases) • [Features](#-key-features) • [Developer Setup](#-developer-quickstart) • [Architecture](#-architecture)

</div>

---

## ⚡ Instant Download & Releases

No Python, Node.js, or command-line experience required. Download the pre-built desktop application for your platform:

| Operating System | Download Package | Setup Type |
|---|---|---|
| **Windows** | [⬇️ Download `ORE-Setup.exe`](https://github.com/Dev-ux210/-KOSS-ORE/releases/latest) | 1-Click Installer / Desktop Shortcut |
| **macOS** | [⬇️ Download `ORE.dmg`](https://github.com/Dev-ux210/-KOSS-ORE/releases/latest) | Drag to Applications (Apple Silicon & Intel) |
| **Linux** | [⬇️ Download `ORE.AppImage`](https://github.com/Dev-ux210/-KOSS-ORE/releases/latest) | Standalone Executable (`chmod +x`) |

> [!TIP]
> **Zero Local Setup Mode**: If you don't have [Ollama](https://ollama.com) installed or don't have a dedicated GPU, you can start the app immediately, click the **AI Engine** button in the header, and paste a free [Google Gemini API Key](https://aistudio.google.com/app/apikey) or Groq key.

---

## 🌟 Key Features

- 📑 **Instant Document Ingestion**: Upload research papers, lecture notes, or textbooks in PDF format with automatic page extraction.
- 🧠 **Local Vector RAG**: Fast chunking and vector storage with ChromaDB, running directly on your computer.
- 🎯 **Verifiable Q&A with Source Citations**: Get accurate answers to complex academic queries, complete with clickable source citations and similarity scores.
- 📝 **AI Revision Notes**: Convert lengthy academic papers into structured, high-yield study summaries.
- 🎓 **Viva Exam Generator**: Automatically generate 15–20 viva questions (MCQ, True/False, and conceptual questions) with full answer keys for exam practice.
- 🔌 **Modular AI Providers**: Switch seamlessly between **Ollama (100% offline local privacy)**, **Google Gemini**, or **OpenAI/Groq** directly from the UI.

---

## 🏗 Architecture

```text
ore/
├── desktop/           🖥️ Electron desktop wrapper (bundles backend binary + static UI)
├── frontend/          🎨 Next.js 16 + React 19 + Tailwind v4 study workstation UI
├── backend/           🧠 FastAPI HTTP API + ChromaDB + PyMuPDF + Modular AI providers
├── ai-rag/            🤖 Core Python ingestion, chunking, and embedding library
├── .github/           🚀 Automated CI/CD cross-platform release pipeline
└── docs/              📚 Architecture & Getting Started guides
```

---

## 💻 Developer Quickstart

To run ORE locally from source for development:

### 1. Prerequisites
- Python 3.9+
- Node.js 20+
- (Optional) [Ollama](https://ollama.com) with `llama3` and `nomic-embed-text`

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .[dev]
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build Desktop Executable Locally
```bash
# Build standalone Python backend executable
cd backend
python build_binary.py

# Build static frontend export
cd ../frontend
npm run build

# Package Electron desktop app
cd ../desktop
npm install
npm run dist
```
Installers will be generated in `desktop/release/`.

---

## 📄 License

MIT © Kaju Open Source. See [LICENSE](LICENSE).
