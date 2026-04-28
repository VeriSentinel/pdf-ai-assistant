/**
 * TF-IDF Vector Store
 * Stores document chunks and enables cosine similarity search
 */

// In-memory store: sessionId -> { chunks, tfidf, idf, vocabulary }
const store = new Map();

/**
 * Tokenize text into terms
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Compute TF for a document
 */
function computeTF(tokens) {
  const tf = {};
  const total = tokens.length;
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  for (const token in tf) {
    tf[token] = tf[token] / total;
  }
  return tf;
}

/**
 * Compute IDF across all documents
 */
function computeIDF(allTokenSets) {
  const docCount = allTokenSets.length;
  const idf = {};
  const vocabulary = new Set();

  for (const tokens of allTokenSets) {
    const unique = new Set(tokens);
    for (const token of unique) {
      vocabulary.add(token);
      idf[token] = (idf[token] || 0) + 1;
    }
  }

  for (const token in idf) {
    idf[token] = Math.log((docCount + 1) / (idf[token] + 1)) + 1;
  }

  return { idf, vocabulary: [...vocabulary] };
}

/**
 * Compute TF-IDF vector for a document
 */
function computeTFIDF(tf, idf, vocabulary) {
  const vector = new Array(vocabulary.length).fill(0);
  for (let i = 0; i < vocabulary.length; i++) {
    const term = vocabulary[i];
    if (tf[term] && idf[term]) {
      vector[i] = tf[term] * idf[term];
    }
  }
  return vector;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Index chunks into the store for a session
 */
function indexChunks(sessionId, chunks) {
  const allTokens = chunks.map(chunk => tokenize(chunk.text));
  const { idf, vocabulary } = computeIDF(allTokens);

  const indexedChunks = chunks.map((chunk, i) => {
    const tf = computeTF(allTokens[i]);
    const vector = computeTFIDF(tf, idf, vocabulary);
    return { ...chunk, vector };
  });

  store.set(sessionId, {
    chunks: indexedChunks,
    idf,
    vocabulary,
  });

  console.log(`📚 Indexed ${chunks.length} chunks for session ${sessionId}`);
  return indexedChunks.length;
}

/**
 * Search for top-k most relevant chunks for a query
 */
function searchChunks(sessionId, query, topK = 5) {
  const session = store.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const { chunks, idf, vocabulary } = session;
  const queryTokens = tokenize(query);
  const queryTF = computeTF(queryTokens);
  const queryVector = computeTFIDF(queryTF, idf, vocabulary);

  const scored = chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryVector, chunk.vector),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(c => c.score > 0)
    .map(({ vector, score, ...rest }) => ({ ...rest, score }));
}

/**
 * Get all chunks for a session (for question generation)
 */
function getSessionChunks(sessionId) {
  const session = store.get(sessionId);
  if (!session) return [];
  return session.chunks.map(({ vector, ...rest }) => rest);
}

/**
 * Check if session exists
 */
function sessionExists(sessionId) {
  return store.has(sessionId);
}

/**
 * Delete a session
 */
function deleteSession(sessionId) {
  store.delete(sessionId);
}

// Common English stopwords
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man',
  'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let',
  'put', 'say', 'she', 'too', 'use', 'that', 'this', 'with', 'have', 'from',
  'they', 'will', 'been', 'said', 'each', 'which', 'their', 'time', 'more',
  'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many',
  'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'your',
  'also', 'back', 'does', 'down', 'even', 'into', 'most', 'only', 'some',
  'than', 'then', 'there', 'these', 'those', 'through', 'about', 'after',
  'before', 'being', 'could', 'every', 'first', 'found', 'great', 'might',
  'other', 'right', 'shall', 'still', 'under', 'where', 'while', 'would',
]);

module.exports = {
  indexChunks,
  searchChunks,
  getSessionChunks,
  sessionExists,
  deleteSession,
};
