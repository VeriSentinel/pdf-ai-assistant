# PDF AI Assistant

> **Upload any PDF and instantly get AI-powered answers with smart semantic search.**

Built with React + Node.js + OpenRouter (Claude AI).

---

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment

The `.env` file in `backend/` is already configured. To update the API key:

```bash
# backend/.env
PORT=3001
OPENROUTER_API_KEY=your-openrouter-key-here
FRONTEND_URL=http://localhost:5173
```

### 4. Start the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open → **http://localhost:5173**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 PDF Upload | Drag-drop or click to upload any PDF (up to 50MB, 100+ pages) |
| 🔍 Smart Search | TF-IDF vector search — finds most relevant chunks instantly |
| 💬 AI Chat | Streaming answers from Claude Opus with free fallback models |
| 🎯 Auto Questions | 8 AI-generated questions from your document content |
| 📚 Source Cards | See exactly which PDF sections were used for each answer |
| 💾 Export Q&A | Download your full Q&A history as markdown |
| 📱 Responsive | Full desktop split-panel + mobile tab layout |

---

## 🤖 AI Model Chain

The app tries these models in order, falling back if rate-limited:

1. `anthropic/claude-opus-4` (primary)
2. `anthropic/claude-sonnet-4-5` (fallback 1)
3. `google/gemma-3-27b-it:free` (fallback 2 — free tier)
4. `meta-llama/llama-3.3-70b-instruct:free` (fallback 3 — free tier)
5. `mistralai/mistral-7b-instruct:free` (fallback 4 — free tier)

---

## 🏗️ Architecture

```
pdf-ai-assistant/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server
│   │   ├── routes/pdf.js         # API routes
│   │   ├── services/
│   │   │   ├── pdfService.js     # PDF parsing + chunking
│   │   │   └── aiService.js      # OpenRouter AI + fallbacks
│   │   └── utils/vectorStore.js  # TF-IDF semantic search
│   └── uploads/                  # Temp PDF storage
└── frontend/
    └── src/
        ├── App.jsx               # Main layout
        ├── components/
        │   ├── UploadZone.jsx    # Drag-drop upload
        │   ├── PDFViewer.jsx     # PDF.js viewer
        │   ├── QuestionPanel.jsx # AI question cards
        │   └── ChatInterface.jsx # Streaming chat
        └── services/api.js       # API client
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload-pdf` | Upload PDF → extract + chunk + index |
| POST | `/api/generate-questions` | AI generates 8 suggested questions |
| POST | `/api/ask-question` | Semantic search + streaming AI answer |
| POST | `/api/export` | Export Q&A history as markdown |

---

## 🔧 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, Framer Motion, react-pdf, react-markdown
- **Backend**: Node.js, Express, multer, pdf-parse, axios
- **AI**: OpenRouter API (Claude Opus → free model fallbacks)
- **Vector Search**: TF-IDF cosine similarity (no external API needed)
