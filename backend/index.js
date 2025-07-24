const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
const upload = multer({ dest: 'uploads/' });


// Setting up OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
//const openai = new OpenAIApi(configuration);

//similarity for each page with user question
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}


// POST /chat endpoint

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!embeddedPages.length) {
    return res.status(400).json({ error: 'No PDF uploaded yet.' });
  }

  try {
    //  Embeding user's question
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message
    });

    const questionVector = embeddingRes.data[0].embedding;

    // Find top 3 most relevant pages using cosine similarity
    const scoredPages = embeddedPages.map(page => ({
      ...page,
      score: cosineSimilarity(questionVector, page.vector)
    }));

    const topPages = scoredPages
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // top 3 pages

    // Building gpt prompt with selected pages
    const contextText = topPages.map(p => `Page ${p.page}: ${p.text}`).join('\n\n');

    const chatRes = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `You are a helpful assistant answering based only on the following PDF content:\n\n${contextText}` },
        { role: 'user', content: message }
      ]
    });

    const reply = chatRes.choices[0].message.content;

    // Return the reply plus citation pages
    res.json({
      reply,
      citations: topPages.map(p => p.page)  // for clickable citation buttons
    });

    console.log('📩 Received question:', message);
    console.log('📄 Embedded pages loaded:', embeddedPages.length);
    console.log('📩 User question received:', message);
    console.log('📄 Pages loaded:', embeddedPages.length);
    console.log('🔐 API Key:', process.env.OPENAI_API_KEY ? 'Found' : 'Missing!');



  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Something went wrong with OpenAI.' });
  }
});



let embeddedPages = []; // store page chunks + vectors for later

app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(fileBuffer);

    // Split PDF by page
    const pages = data.text.split(/\f/).map((text, i) => ({
      page: i + 1,
      text: text.trim()
    }));

    // Embed each page
    embeddedPages = [];

    for (const page of pages) {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: page.text
      });

      const vector = embeddingRes.data[0].embedding;
      embeddedPages.push({ ...page, vector });
    }

    fs.unlinkSync(req.file.path); // cleanup
    res.json({ message: 'PDF uploaded and embedded successfully', totalPages: embeddedPages.length });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
