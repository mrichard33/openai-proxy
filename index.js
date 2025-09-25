const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-chat-latest'; // use your preferred model
const OPENAI_URL = 'https://api.openai.com/v1/responses';

// Health check
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// Exact prompt, only {address} is replaced
const AVM_PROMPT_TEMPLATE =
  'Act as an expert real estate AVM (Automated Valuation Model). Your task is to provide a highly accurate, up-to-date fair market value for the property at the following address. Methodology: 1. Property Lookup: First, identify the core attributes of the subject property from public records (e.g., Zillow, Redfin, county records). Key attributes include: living area square footage, bed/bath count, and lot size. 2. Comparable Sales: Second, find at least 3 recent comparable sales (comps) of similar properties sold within the last 12 months in the immediate neighborhood. 3. Market Adjustment: Third, adjust the valuation based on current local market trends and price per square foot. Do not use outdated tax assessments or old sale prices as the final value. 4. Final Estimate: Synthesize all data into a single estimated value. Your response must be a single integer representing the fair market value in USD. Do not include any text, dollar signs, or commas. Address: {address}';

app.post('/api/openai-proxy', async (req, res) => {
  console.log('\n--- NEW REQUEST RECEIVED ---');
  try {
    const { address } = req.body;
    console.log(`[1/5] Received address from browser: "${address}"`);
    if (!address) {
      console.error('[ERROR] Address is missing in the request body.');
      return res.status(400).json({ error: 'Address is required' });
    }

    const prompt = AVM_PROMPT_TEMPLATE.replace('{address}', address);

    console.log('[2/5] Sending exact prompt to OpenAI Responses API.');

    const openaiResponse = await axios.post(
      OPENAI_URL,
      { model: OPENAI_MODEL, input: prompt },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 30000
      }
    );

    console.log(`[3/5] Received response from OpenAI with status: ${openaiResponse.status}`);
    console.log('--- START OPENAI RESPONSE ---');
    console.log(JSON.stringify(openaiResponse.data, null, 2));
    console.log('--- END OPENAI RESPONSE ---');

    // Extract assistant text from Responses API
    const text =
      openaiResponse.data?.output?.[0]?.content?.[0]?.text ??
      openaiResponse.data?.output_text ??
      null;

    console.log(`[4/5] Extracted text: "${text}"`);

    const digits = String(text || '').replace(/[^\d]/g, '');
    const value = digits ? parseInt(digits, 10) : null;

    const finalResponse = { value, raw: text };
    console.log('[5/5] Sending this JSON back to the browser:', finalResponse);

    return res.status(200).json(finalResponse);
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('[FATAL PROXY ERROR] The process failed.', errorMessage);
    return res.status(200).json({ value: null, error: errorMessage });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`OpenAI proxy server is listening on port ${PORT}`);
});
