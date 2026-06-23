/**
 * ZAI API Proxy Service
 * 
 * Runs on the sandbox (which can access internal-api.z.ai)
 * and exposes a public endpoint for VPS to call ZAI APIs.
 * 
 * Endpoint: POST /chat/completions  (proxied to internal-api.z.ai/v1/chat/completions)
 * Endpoint: GET  /health
 */
import http from 'http';
import { readFileSync } from 'fs';

const PORT = 3100;

// Load ZAI config from sandbox
const zaiConfig = JSON.parse(readFileSync('/etc/.z-ai-config', 'utf-8'));
const ZAI_BASE_URL = zaiConfig.baseUrl; // https://internal-api.z.ai/v1

console.log(`[ZAI-Proxy] Starting on port ${PORT}`);
console.log(`[ZAI-Proxy] Upstream: ${ZAI_BASE_URL}`);

/**
 * Forward a request to internal-api.z.ai
 */
async function forwardRequest(pathname, method, headers, body) {
  const url = `${ZAI_BASE_URL}${pathname}`;
  const fwdHeaders = {
    'Content-Type': headers['content-type'] || 'application/json',
    'Authorization': `Bearer ${zaiConfig.apiKey}`,
    'X-Z-AI-From': 'Z',
    'X-Chat-Id': zaiConfig.chatId,
    'X-User-Id': zaiConfig.userId,
    'X-Token': zaiConfig.token,
  };

  console.log(`[ZAI-Proxy] -> ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers: fwdHeaders,
    body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
  });

  return response;
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', upstream: ZAI_BASE_URL }));
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Forward to ZAI API
    const upstream = await forwardRequest(req.url, req.method, req.headers, body);

    // Stream response back
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else {
      res.end();
    }
  } catch (error) {
    console.error('[ZAI-Proxy] Error:', error.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: error.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ZAI-Proxy] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[ZAI-Proxy] Ready to proxy requests to ${ZAI_BASE_URL}`);
});
