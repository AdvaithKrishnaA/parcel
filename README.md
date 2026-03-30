# Parcel Link Bundles

Parcel is a self-hostable, end-to-end encrypted (E2EE) link bundle sharing system.
It features strict separation of concerns, zero-knowledge backend, and encrypted synchronization.

## Architecture
- **Server (`worker/`)**: Cloudflare Worker + R2. Dumb storage + policy enforcement. Does NOT access or inspect payloads.
- **Editor (`apps/editor`)**: Private Vite+React app. Encrypts/decrypts state client-side using Argon2id/AES-GCM.
- **Viewer (`apps/viewer`)**: Public link reader. Decrypts snapshots received via URL fragments. No authentication.
- **Extension (`apps/extension`)**: Quick capture tool syncing the same encrypted state.

## Cryptography
- Storage encryption uses `AES-GCM` (256-bit).
- Key derivation uses `Argon2id` locally via WebAssembly, falling back to Web Crypto APIs.
- Sharing payloads uses per-share 32-byte `folder_key` entirely exposed in the URL fragment (`#...`). Server never sees the fragment.

## Self-Hosting & Deployment

**Prerequisites:** Node.js v18+, Cloudflare Account (R2 enabled), `npx wrangler login`.

### 1. Backend Setup

Initialize your Cloudflare R2 structure and provision the Worker.
```bash
npm install
npx wrangler r2 bucket create parcel-storage
cd worker
npm run deploy
```
*Note the URL displayed by `wrangler deploy` (e.g. `https://parcel-worker.yourdomain.workers.dev`).*

### 2. Configure Apps

Create a `.env.local` inside `apps/editor`, `apps/viewer`, and `apps/extension` to point to the created Worker:

```env
VITE_API_URL=https://parcel-worker.yourdomain.workers.dev
```

### 3. Build & Deploy Apps

Build all applications from the root folder:

```bash
npm run build
```

**Deploy Editor to Cloudflare Workers:**
```bash
cd apps/editor
npx wrangler deploy
```

**Deploy Viewer to Cloudflare Workers:**
```bash
cd ../viewer
npx wrangler deploy
```
*(Optionally setup custom domains so the Viewer links are short).*

### 4. Build Chrome/Safari Extension

```bash
cd apps/extension
npm run build
```
Load the `apps/extension/dist` folder into Chrome as an Unpacked Extension.

## Usage Rules
- All encryption is strictly client-side. If you lose your master password, your synced data is irrecoverable.
- Server maintains purely encrypted blobs.
