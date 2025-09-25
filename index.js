import express from "express";
import cors from "cors";
import { OpenAI } from "openai";

const app = express();
app.use(express.json());
app.use(cors());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Your exact prompt template
const AVM_PROMPT_TEMPLATE =
  "Act as an expert real estate AVM (Automated Valuation Model). Your task is to provide a highly accurate, up-to-date fair market value for the property at the following address. Methodology: 1. Property Lookup: First, identify the core attributes of the subject property from public records (e.g., Zillow, Redfin, county records). Key attributes include: living area square footage, bed/bath count, and lot size. 2. Comparable Sales: Second, find at least 3 recent comparable sales (comps) of similar properties sold within the last 12 months in the immediate neighborhood. 3. Market Adjustment: Third, adjust the valuation based on current local market trends and price per square foot. Do not use outdated tax assessments or old sale prices as the final value. 4. Final Estimate: Synthesize all data into a single estimated value. Your response must be a single integer representing the fair market value in USD. Do not include any text, dollar signs, or commas. Address: {address}";

app.post("/api/openai-proxy", async (req, res) => {
  try {
    const { address } = req.body || {};
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Replace only the placeholder. The rest of the prompt remains identical.
    const prompt = AVM_PROMPT_TEMPLATE.replace("{address}", address);

    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt
    });

    // Extract raw text
    const text = resp.output?.[0]?.content?.[0]?.text ?? "";

    // Return integer if found, else null
    const digits = text.replace(/[^\d]/g, "");
    const value = digits ? parseInt(digits, 10) : null;

    return res.status(200).json({ value, raw: text });
  } catch (err) {
    const message = err?.response?.data || err?.message || "Unknown error";
    return res.status(200).json({ value: null, error: String(message) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`openai-proxy listening on port ${PORT}`);
});
