export interface Env {
  BUCKET: R2Bucket;
  AUTH_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

const getCorsHeaders = (env: Env, request: Request) => {
  const baseHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Vary': 'Origin',
  };

  const origin = request.headers.get('Origin');

  if (!env.ALLOWED_ORIGINS) {
    return { ...baseHeaders, 'Access-Control-Allow-Origin': '*' };
  }

  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  if (origin && allowed.includes(origin)) {
    return { ...baseHeaders, 'Access-Control-Allow-Origin': origin };
  }

  return baseHeaders;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(env, request) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const checkAuth = () => {
        if (!env.AUTH_KEY) {
          return new Response('Server Configuration Error: AUTH_KEY is not set on the Cloudflare Worker.', { status: 500, headers: getCorsHeaders(env, request) });
        }
        const header = request.headers.get('Authorization');
        if (header !== `Bearer ${env.AUTH_KEY}`) {
          return new Response('Unauthorized: Invalid or missing API Auth Key', { status: 401, headers: getCorsHeaders(env, request) });
        }
        return null;
      };

      // POST /create (Editor only) -> creates a share link
      if (path === '/create' && request.method === 'POST') {
        const authErr = checkAuth();
        if (authErr) return authErr;

        const body = await request.json<any>();
        if (!body.blob_key) {
          return new Response('Missing blob_key', { status: 400, headers: getCorsHeaders(env, request) });
        }
        
        // cryptographically secure 8-char random ID for URL
        const array = new Uint8Array(4);
        crypto.getRandomValues(array);
        const id = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        // store the encrypted payload itself directly in R2 or the blob_key 
        // We will store the encrypted payload string.
        await env.BUCKET.put(`share/${id}`, body.blob_key);
        return new Response(JSON.stringify({ id }), {
          headers: { ...getCorsHeaders(env, request), 'Content-Type': 'application/json' },
        });
      }

      // GET /:id (Viewer + Editor) -> fetch share link
      if (path.match(/^\/[a-z0-9]+$/)) {
        const id = path.substring(1);
        if (id !== 'sync' && id !== 'create') {
          const obj = await env.BUCKET.get(`share/${id}`);
          if (!obj) {
            return new Response('Not found', { status: 404, headers: getCorsHeaders(env, request) });
          }
          const data = await obj.text();
          return new Response(data, {
            headers: { ...getCorsHeaders(env, request), 'Content-Type': 'text/plain' },
          });
        }
      }

      // PUT /sync/:user_id (Editor only)
      if (path.startsWith('/sync/') && request.method === 'PUT') {
        const authErr = checkAuth();
        if (authErr) return authErr;

        const userId = path.split('/')[2];
        if (!userId) return new Response('Bad request', { status: 400, headers: getCorsHeaders(env, request) });
        const data = await request.text();
        await env.BUCKET.put(`sync/${userId}`, data);
        return new Response('OK', { headers: getCorsHeaders(env, request) });
      }

      // GET /sync/:user_id (Editor only)
      if (path.startsWith('/sync/') && request.method === 'GET') {
        const authErr = checkAuth();
        if (authErr) return authErr;

        const userId = path.split('/')[2];
        if (!userId) return new Response('Bad request', { status: 400, headers: getCorsHeaders(env, request) });
        const obj = await env.BUCKET.get(`sync/${userId}`);
        if (!obj) {
          return new Response('Not found', { status: 404, headers: getCorsHeaders(env, request) });
        }
        const data = await obj.text();
        return new Response(data, {
          headers: { ...getCorsHeaders(env, request), 'Content-Type': 'text/plain' },
        });
      }

      return new Response('Not found', { status: 404, headers: getCorsHeaders(env, request) });
    } catch (e: unknown) {
      console.error('Worker fetch error:', e);
      return new Response('Internal Server Error', { status: 500, headers: getCorsHeaders(env, request) });
    }
  },
};
