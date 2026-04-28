const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * Extract text from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {{ text: string, pages: number, info: object }}
 */
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info || {},
  };
}

/**
 * Clean extracted text
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Split text into overlapping chunks
 * @param {string} text
 * @param {number} chunkSize - characters per chunk
 * @param {number} overlap - overlap characters
 * @returns {Array<{id: number, text: string, start: number, end: number}>}
 */
function chunkText(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  const cleanedText = cleanText(text);

  // Try to split on paragraph boundaries first
  const paragraphs = cleanedText.split(/\n\n+/);
  let currentChunk = '';
  let chunkId = 0;
  let charPosition = 0;

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

    if ((currentChunk + '\n\n' + trimmedPara).length <= chunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
    } else {
      if (currentChunk) {
        chunks.push({
          id: chunkId++,
          text: currentChunk.trim(),
          start: charPosition,
          end: charPosition + currentChunk.length,
        });
        charPosition += currentChunk.length - overlap;
        // Keep overlap from previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + '\n\n' + trimmedPara;
      } else {
        // Paragraph itself is too long, split by sentences
        const sentences = trimmedPara.match(/[^.!?]+[.!?]+/g) || [trimmedPara];
        for (const sentence of sentences) {
          if ((currentChunk + ' ' + sentence).length <= chunkSize) {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
          } else {
            if (currentChunk) {
              chunks.push({
                id: chunkId++,
                text: currentChunk.trim(),
                start: charPosition,
                end: charPosition + currentChunk.length,
              });
              charPosition += currentChunk.length - overlap;
            }
            currentChunk = sentence;
          }
        }
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: chunkId++,
      text: currentChunk.trim(),
      start: charPosition,
      end: charPosition + currentChunk.length,
    });
  }

  return chunks;
}

module.exports = { extractTextFromPDF, cleanText, chunkText };
