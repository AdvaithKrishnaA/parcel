export async function fetchBlob(apiUrl: string, id: string, authKey?: string): Promise<string | null> {
  const headers: Record<string, string> = {};
  if (authKey) headers['Authorization'] = `Bearer ${authKey}`;
  const resp = await fetch(`${apiUrl}/sync/${id}`, { headers });
  if (resp.status === 404) return null;
  if (resp.status === 401) throw new Error('ERR_UNAUTHORIZED');
  if (!resp.ok) throw new Error(`Failed to fetch blob (HTTP ${resp.status})`);
  return await resp.text();
}

export async function saveBlob(apiUrl: string, id: string, encryptedBlob: string, authKey?: string): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
  if (authKey) headers['Authorization'] = `Bearer ${authKey}`;
  const resp = await fetch(`${apiUrl}/sync/${id}`, {
    method: 'PUT',
    headers,
    body: encryptedBlob,
  });
  if (!resp.ok) throw new Error('Failed to save blob: ' + resp.statusText);
}

export async function createShare(apiUrl: string, encryptedPayload: string, authKey?: string): Promise<{ id: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authKey) headers['Authorization'] = `Bearer ${authKey}`;
  const resp = await fetch(`${apiUrl}/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ blob_key: encryptedPayload }),
  });
  if (!resp.ok) throw new Error('Failed to create share: ' + resp.statusText);
  return await resp.json();
}

export async function fetchShare(apiUrl: string, id: string): Promise<string> {
  const resp = await fetch(`${apiUrl}/${id}`);
  if (!resp.ok) throw new Error('Share not found or expired');
  return await resp.text();
}
