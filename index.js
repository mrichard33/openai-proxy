import express from "express";
import cors from "cors";
import { OpenAI } from "openai";

const app = express();
app.use(express.json());

// Configure CORS, set ALLOWED_ORIGINS in Railway Variables, comma separated
const allowed = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) || ["*"];
app.use(cors({
  origin: function(origin, cb) {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Origin not allowed by CORS"));
  }
}));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional schema to enforce integer output
const avmSchema = {
  name: "avm_integer_only",
  schema: {
    type: "object",
    properties: {
      value: { type: "integer", description: "Fair market value in USD as an integer" }
    },
    required: ["value"],
    additionalProperties: false
  },
  strict: true
};

// Health check
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// Proxy endpoint
app.post("/api/openai-proxy", async (req, res) => {
  try {
    const { prompt, address } = req.body || {};
    if (!prompt && !address) {
      return res.status(400).json({ error: "Provide prompt or address" });
    }

    // If using your AVM pattern, build the instruction from address
    const userInput = prompt ?? `Act as an expert real estate AVM. Output a single integer in USD. Address: ${address}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      system: "Return a JSON object with a single integer field named value, no extra commentary.",
      input: userInput,
      response_format: { type: "json_schema", json_schema: avmSchema }
    });

    const text = response.output?.[0]?.content?.[0]?.text ?? null;

    let value = null;
    try {
      if (text) {
        const parsed = JSON.parse(text);
        value = Number.isInteger(parsed?.value) ? parsed.value : null;
      }
    } catch {
      const digits = String(text || "").replace(/[^\d]/g, "");
      value = digits ? parseInt(digits, 10) : null;
    }

    return res.status(200).json({ value });
  } catch (err) {
    const message = err?.response?.data || err?.message || "Unknown error";
    return res.status(200).json({ value: null, error: String(message) });
  }
});

// Port from env or default
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`openai-proxy listening on port ${PORT}`);
});
