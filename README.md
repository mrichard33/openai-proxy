OpenAI proxy

Endpoints:
POST /api/openai-proxy
Body: { "prompt": "your instruction" } or { "address": "123 Main St, City, ST" }
Response: { "value": 1234567 } or { "value": null, "error": "message" }

Env variables:
OPENAI_API_KEY required
OPENAI_MODEL optional, default gpt-4.1-mini
ALLOWED_ORIGINS optional, comma separated list
PORT optional, default 3001
