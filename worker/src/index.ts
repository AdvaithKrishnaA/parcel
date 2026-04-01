export interface Env {
  BUCKET: R2Bucket;
  AUTH_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const checkAuth = () => {
        if (!env.AUTH_KEY) {
          return new Response('Server Configuration Error: AUTH_KEY is not set on the Cloudflare Worker.', { status: 500, headers: CORS_HEADERS });
        }
        const header = request.headers.get('Authorization');
        if (header !== `Bearer ${env.AUTH_KEY}`) {
          return new Response('Unauthorized: Invalid or missing API Auth Key', { status: 401, headers: CORS_HEADERS });
        }
        return null;
      };

      // POST /create (Editor only) -> creates a share link
      if (path === '/create' && request.method === 'POST') {
        const authErr = checkAuth();
        if (authErr) return authErr;

        const body = await request.json<any>();
        if (!body.blob_key) {
          return new Response('Missing blob_key', { status: 400, headers: CORS_HEADERS });
        }
        
        // cryptographically secure 8-char random ID for URL
        const array = new Uint8Array(4);
        crypto.getRandomValues(array);
        const id = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        // store the encrypted payload itself directly in R2 or the blob_key 
        // We will store the encrypted payload string.
        await env.BUCKET.put(`share/${id}`, body.blob_key);
        return new Response(JSON.stringify({ id }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // GET /:id (Viewer + Editor) -> fetch share link
      if (path.match(/^\/[a-z0-9]+$/)) {
        const id = path.substring(1);
        if (id !== 'sync' && id !== 'create') {
          const obj = await env.BUCKET.get(`share/${id}`);
          if (!obj) {
            return new Response('Not found', { status: 404, headers: CORS_HEADERS });
          }
          const data = await obj.text();
          return new Response(data, {
            headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
          });
        }
      }

      // PUT /sync/:user_id (Editor only)
      if (path.startsWith('/sync/') && request.method === 'PUT') {
        const authErr = checkAuth();
        if (authErr) return authErr;

        const userId = path.split('/')[2];
        if (!userId) return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
        const data = await request.text();
        await env.BUCKET.put(`sync/${userId}`, data);
        return new Response('OK', { headers: CORS_HEADERS });
      }

      // GET /sync/:user_id (Editor only)
      if (path.startsWith('/sync/') && request.method === 'GET') {
        const authErr = checkAuth();
        if (authErr) return authErr;

        const userId = path.split('/')[2];
        if (!userId) return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
        const obj = await env.BUCKET.get(`sync/${userId}`);
        if (!obj) {
          return new Response('Not found', { status: 404, headers: CORS_HEADERS });
        }
        const data = await obj.text();
        return new Response(data, {
          headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
        });
      }

      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    } catch (e: unknown) {
      return new Response(e instanceof Error ? e.message : String(e), { status: 500, headers: CORS_HEADERS });
    }
  },
};
