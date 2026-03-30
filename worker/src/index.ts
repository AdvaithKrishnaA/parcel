export interface Env {
  BUCKET: R2Bucket;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // POST /create (Editor only) -> creates a share link
      if (path === '/create' && request.method === 'POST') {
        const body = await request.json<any>();
        if (!body.blob_key) {
          return new Response('Missing blob_key', { status: 400, headers: CORS_HEADERS });
        }
        
        // simple 8-char random ID for URL
        const id = Math.random().toString(36).substring(2, 10);
        
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
        const userId = path.split('/')[2];
        if (!userId) return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
        const data = await request.text();
        await env.BUCKET.put(`sync/${userId}`, data);
        return new Response('OK', { headers: CORS_HEADERS });
      }

      // GET /sync/:user_id (Editor only)
      if (path.startsWith('/sync/') && request.method === 'GET') {
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
    } catch (e: any) {
      return new Response(e.message, { status: 500, headers: CORS_HEADERS });
    }
  },
};
