export async function fetchBlob(apiUrl: string, id: string): Promise<string | null> {
  const resp = await fetch(`${apiUrl}/sync/${id}`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error('Failed to fetch blob');
  return await resp.text();
}

export async function saveBlob(apiUrl: string, id: string, encryptedBlob: string): Promise<void> {
  const resp = await fetch(`${apiUrl}/sync/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: encryptedBlob,
  });
  if (!resp.ok) throw new Error('Failed to save blob');
}

export async function createShare(apiUrl: string, encryptedPayload: string): Promise<{ id: string }> {
  const resp = await fetch(`${apiUrl}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blob_key: encryptedPayload }),
  });
  if (!resp.ok) throw new Error('Failed to create share');
  return await resp.json();
}

export async function fetchShare(apiUrl: string, id: string): Promise<string> {
  const resp = await fetch(`${apiUrl}/${id}`);
  if (!resp.ok) throw new Error('Share not found or expired');
  return await resp.text();
}
