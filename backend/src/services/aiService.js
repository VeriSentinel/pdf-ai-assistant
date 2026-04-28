const axios = require('axios');

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY;

// All-free model list (key has no paid credits)
// Ordered by quality + reliability — tries multiple so rate limits are bypassed
const MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-coder:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

function getHeaders() {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': 'PDF AI Assistant',
  };
}

/**
 * Non-streaming chat completion with model fallback chain
 */
async function chatCompletion(messages, options = {}) {
  const { maxTokens = 1500, temperature = 0.7 } = options;

  const errors = [];
  for (const model of MODELS) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        { model, messages, max_tokens: maxTokens, temperature },
        { headers: getHeaders(), timeout: 30000 }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        console.log(`✅ Response from: ${model}`);
        return { content, model };
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`⚠️  ${model} failed (${status}): ${msg}`);
      errors.push(`${model}: ${msg}`);
      if (status === 401) throw new Error('Invalid API key. Check OPENROUTER_API_KEY in .env');
    }
  }
  throw new Error(`All models failed:\n${errors.join('\n')}`);
}

/**
 * Streaming chat completion — writes SSE to Express response
 */
async function streamChatCompletion(messages, res, options = {}) {
  const { maxTokens = 2000, temperature = 0.7 } = options;

  const errors = [];
  for (const model of MODELS) {
    try {
      console.log(`🤖 Streaming with: ${model}`);

      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        { model, messages, max_tokens: maxTokens, temperature, stream: true },
        { headers: getHeaders(), responseType: 'stream', timeout: 60000 }
      );

      // Send which model is being used
      res.write(`data: ${JSON.stringify({ type: 'model', model })}\n\n`);

      return await new Promise((resolve, reject) => {
        let buffer = '';
        let tokenCount = 0;

        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop(); // keep incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                tokenCount++;
                res.write(`data: ${JSON.stringify({ type: 'token', content: delta })}\n\n`);
              }
            } catch (_) { /* skip malformed */ }
          }
        });

        response.data.on('end', () => {
          console.log(`✅ Streaming done: ${tokenCount} tokens from ${model}`);
          resolve();
        });

        response.data.on('error', (err) => {
          console.warn(`⚠️  Stream error from ${model}:`, err.message);
          reject(err);
        });
      });

    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`⚠️  Streaming failed for ${model} (${status}): ${msg}`);
      errors.push(`${model}: ${msg}`);
      if (status === 401) throw new Error('Invalid API key. Check OPENROUTER_API_KEY in .env');
      // Try next model
    }
  }
  throw new Error(`All models failed for streaming:\n${errors.join('\n')}`);
}

/**
 * Generate 8 suggested questions from PDF content
 */
async function generateQuestions(textSample) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert at analyzing documents. Generate exactly 8 insightful, specific questions a reader might want answered about this document.
Return ONLY a valid JSON array of strings. No explanation, no markdown, just the raw JSON array.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?", "Question 6?", "Question 7?", "Question 8?"]`,
    },
    {
      role: 'user',
      content: `Generate 8 specific questions from this document content:\n\n${textSample}`,
    },
  ];

  const { content } = await chatCompletion(messages, { maxTokens: 600, temperature: 0.8 });
  console.log('Raw questions response:', content.slice(0, 200));

  // Try to extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    // Fallback: split by newlines if numbered list
    const lines = content.split('\n').filter(l => l.match(/^\d+\.|^-|^•/));
    if (lines.length >= 3) {
      return lines.slice(0, 8).map(l => l.replace(/^[\d\.\-•\s]+/, '').trim());
    }
    throw new Error('Could not parse questions from AI response: ' + content.slice(0, 100));
  }

  const questions = JSON.parse(jsonMatch[0]);
  return Array.isArray(questions) ? questions.filter(q => typeof q === 'string').slice(0, 8) : [];
}

module.exports = { chatCompletion, streamChatCompletion, generateQuestions };
