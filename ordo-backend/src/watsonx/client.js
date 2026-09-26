/**
 * watsonx.ai client wrapper.
 * Single function: generate(prompt, params) → string
 *
 * Uses the REST API directly (no SDK dependency on auth flow).
 * Model is fixed to ibm/granite-3-8b-instruct per architecture decision.
 */

const MODEL_ID = process.env.WATSONX_MODEL_ID || 'meta-llama/llama-3-3-70b-instruct';
const REGION = process.env.WATSONX_REGION || 'us-south';
const PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const API_KEY = process.env.WATSONX_API_KEY;

const GENERATION_URL = `https://${REGION}.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-02`;
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Fetch (and cache) an IAM bearer token from the API key.
 * Tokens are valid for ~1 hour; we refresh 5 minutes early.
 */
async function getIAMToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const res = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(API_KEY)}`,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IAM token fetch failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // expires_in is in seconds; refresh 5 min early
  tokenExpiry = now + (data.expires_in - 300) * 1000;
  return cachedToken;
}

/**
 * Generate text from watsonx.ai.
 *
 * @param {string} prompt
 * @param {object} params - override defaults
 *   decoding_method: 'greedy' | 'sample'
 *   max_new_tokens: number
 *   temperature: number (only for 'sample')
 * @returns {Promise<string>} generated text
 */
export async function generate(prompt, params = {}) {
  if (!API_KEY || API_KEY === 'your-iam-api-key-here') {
    throw new Error('WATSONX_API_KEY is not configured. Set it in ordo-backend/.env');
  }
  if (!PROJECT_ID || PROJECT_ID === 'your-project-uuid-here') {
    throw new Error('WATSONX_PROJECT_ID is not configured. Set it in ordo-backend/.env');
  }

  const token = await getIAMToken();

  // Use Chat API — works with both instruct and base models
  const chatUrl = `https://${REGION}.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-02`;
  const body = {
    model_id: MODEL_ID,
    project_id: PROJECT_ID,
    messages: [
      { role: 'user', content: prompt }
    ],
    parameters: {
      max_new_tokens: params.max_new_tokens || 512,
      temperature: params.temperature || (params.decoding_method === 'sample' ? 0.7 : 0),
    },
  };

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`watsonx.ai API error (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('watsonx.ai returned empty result');
      return text.trim();
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        console.warn(`[watsonx] Attempt ${attempt} failed, retrying...`, err.message);
        await new Promise((r) => setTimeout(r, 1000));
        cachedToken = null;
        tokenExpiry = 0;
      }
    }
  }
  throw lastErr;
}

export { MODEL_ID };
