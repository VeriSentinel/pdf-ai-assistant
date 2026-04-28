const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { extractTextFromPDF, chunkText, cleanText } = require('../services/pdfService');
const { indexChunks, searchChunks, getSessionChunks, sessionExists } = require('../utils/vectorStore');
const { generateQuestions, streamChatCompletion, chatCompletion } = require('../services/aiService');

const router = express.Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../uploads');;
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// ─────────────────────────────────────────────────────────────
// POST /api/upload-pdf
// ─────────────────────────────────────────────────────────────
router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  const sessionId = uuidv4();
  const filePath = req.file.path;

  try {
    console.log(`📄 Processing: ${req.file.originalname}`);

    // Extract text from PDF
    const { text, pages, info } = await extractTextFromPDF(filePath);

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract text from PDF. It may be scanned or image-based.' });
    }

    // Chunk the text
    const chunks = chunkText(text, 800, 150);
    console.log(`📦 Created ${chunks.length} chunks from ${pages} pages`);

    // Index chunks with TF-IDF
    indexChunks(sessionId, chunks);

    // Clean up uploaded file after processing (keep text in memory)
    // Don't delete — frontend needs filename for display

    res.json({
      success: true,
      sessionId,
      filename: req.file.originalname,
      pages,
      chunks: chunks.length,
      wordCount: text.split(/\s+/).length,
      preview: cleanText(text).slice(0, 300) + '...',
      info: {
        title: info.Title || req.file.originalname,
        author: info.Author || 'Unknown',
        subject: info.Subject || '',
      },
    });

  } catch (err) {
    console.error('PDF processing error:', err);
    // Cleanup file on error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: `Failed to process PDF: ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/generate-questions
// ─────────────────────────────────────────────────────────────
router.post('/generate-questions', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  if (!sessionExists(sessionId)) return res.status(404).json({ error: 'Session not found. Please re-upload your PDF.' });

  try {
    const chunks = getSessionChunks(sessionId);
    if (chunks.length === 0) return res.status(400).json({ error: 'No content found in session' });

    // Use first ~3000 chars from most content-rich chunks for question generation
    const sampleChunks = chunks.slice(0, Math.min(6, chunks.length));
    const textSample = sampleChunks.map(c => c.text).join('\n\n').slice(0, 3000);

    const questions = await generateQuestions(textSample);

    res.json({ success: true, questions });
  } catch (err) {
    console.error('Question generation error:', err);
    res.status(500).json({ error: `Failed to generate questions: ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/ask-question (streaming SSE)
// ─────────────────────────────────────────────────────────────
router.post('/ask-question', async (req, res) => {
  const { sessionId, question, stream = true } = req.body;

  if (!sessionId || !question) {
    return res.status(400).json({ error: 'sessionId and question are required' });
  }
  if (!sessionExists(sessionId)) {
    return res.status(404).json({ error: 'Session not found. Please re-upload your PDF.' });
  }

  try {
    // Search for relevant chunks
    const relevantChunks = searchChunks(sessionId, question, 5);

    if (relevantChunks.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find relevant information in the document to answer this question. Try rephrasing or ask about specific topics mentioned in the PDF.",
        sources: [],
      });
    }

    const context = relevantChunks.map((c, i) => `[Source ${i + 1}]\n${c.text}`).join('\n\n---\n\n');

    const messages = [
      {
        role: 'system',
        content: `You are an expert document analyst. Answer questions accurately based ONLY on the provided document context.
If the context doesn't contain enough information, say so clearly.
Format your answer with:
- A clear, direct answer in the first paragraph
- Supporting details with bullet points where appropriate  
- Reference to specific parts of the document when relevant
Be concise but thorough. Use markdown formatting.`,
      },
      {
        role: 'user',
        content: `Document context:\n\n${context}\n\n---\n\nQuestion: ${question}`,
      },
    ];

    if (stream) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send sources first
      res.write(`data: ${JSON.stringify({
        type: 'sources',
        sources: relevantChunks.map(c => ({ id: c.id, text: c.text.slice(0, 200) + '...', score: c.score })),
      })}\n\n`);

      await streamChatCompletion(messages, res);
      res.end();
    } else {
      const { content, model } = await chatCompletion(messages);
      res.json({
        answer: content,
        model,
        sources: relevantChunks.map(c => ({ id: c.id, text: c.text.slice(0, 200) + '...', score: c.score })),
      });
    }

  } catch (err) {
    console.error('Ask question error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Failed to answer question: ${err.message}` });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/export
// ─────────────────────────────────────────────────────────────
router.post('/export', async (req, res) => {
  const { history, filename } = req.body;

  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'history array required' });
  }

  try {
    const timestamp = new Date().toISOString().split('T')[0];
    let markdown = `# PDF AI Assistant — Q&A Export\n`;
    markdown += `**Document:** ${filename || 'Unknown'}\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;

    history.forEach((item, i) => {
      markdown += `## Q${i + 1}: ${item.question}\n\n`;
      markdown += `${item.answer}\n\n`;
      if (item.sources && item.sources.length > 0) {
        markdown += `**Sources used:**\n`;
        item.sources.forEach((s, j) => {
          markdown += `> ${j + 1}. ${s.text}\n`;
        });
        markdown += '\n';
      }
      markdown += `---\n\n`;
    });

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="qa-export-${timestamp}.md"`);
    res.send(markdown);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
