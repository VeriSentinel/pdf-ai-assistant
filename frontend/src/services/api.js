import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

/**
 * Upload a PDF file
 */
export async function uploadPDF(file, onProgress) {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await api.post('/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
}

/**
 * Generate questions for a session
 */
export async function generateQuestions(sessionId) {
  const response = await api.post('/generate-questions', { sessionId });
  return response.data.questions;
}

/**
 * Ask a question with streaming response
 * @param {string} sessionId
 * @param {string} question
 * @param {function} onToken - called with each token chunk
 * @param {function} onSources - called with source chunks
 * @param {function} onModel - called with model name
 */
export async function askQuestion(sessionId, question, { onToken, onSources, onModel, onError } = {}) {
  const response = await fetch(`${API_BASE}/ask-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, question, stream: true }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to get answer');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'token' && onToken) onToken(data.content);
        if (data.type === 'sources' && onSources) onSources(data.sources);
        if (data.type === 'model' && onModel) onModel(data.model);
        if (data.type === 'error' && onError) onError(data.message);
      } catch (e) {
        // Skip malformed
      }
    }
  }
}

/**
 * Export Q&A history as markdown
 */
export async function exportHistory(history, filename) {
  const response = await api.post('/export', { history, filename }, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `qa-export-${Date.now()}.md`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default api;
