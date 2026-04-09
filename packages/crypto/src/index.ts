import { argon2id } from 'hash-wasm';

const SALT = new TextEncoder().encode('parcel-static-salt');

// Generate 32 random bytes (folder_key)
export function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function encodeBase64Url(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let binString = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    // @ts-expect-error - apply accepts numeric array or typed array in modern environments
    binString += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBase64Url(base64: string): Uint8Array {
  const str = base64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  const padded = pad ? str + '='.repeat(4 - pad) : str;
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

// Derive argon2id key from password
export async function deriveUserMasterKey(password: string): Promise<Uint8Array> {
  const out = await argon2id({
    password,
    salt: SALT,
    parallelism: 1,
    iterations: 2,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary',
  });
  return out;
}

// Convert raw Uint8Array to CryptoKey for AES-GCM
export async function importGcmKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(rawKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt payload with AES-GCM
export async function encryptPayload(key: Uint8Array, data: unknown): Promise<string> {
  const cryptoKey = await importGcmKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return encodeBase64Url(combined);
}

// Decrypt payload with AES-GCM
export async function decryptPayload(key: Uint8Array, cipherBase64: string): Promise<unknown> {
  const cryptoKey = await importGcmKey(key);
  const combined = decodeBase64Url(cipherBase64);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

export async function hashUserId(masterKeyBytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(masterKeyBytes));
  return encodeBase64Url(new Uint8Array(hash));
}
