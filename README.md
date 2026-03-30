# Parcel: End-to-End Encrypted Link Bundles

Parcel is a self-hostable, end-to-end encrypted (E2EE) link bundle manager. It allows you to group links, save them privately, and share them securely—all while verifying the server *never* sees your unencrypted data.

## Features
- **Zero-Knowledge Backend:** Powered by Cloudflare Workers & R2. It only stores heavily encrypted blobs.
- **Client-Side Encryption:** Your data is encrypted locally using AES-GCM (256-bit) and Argon2id.
- **Secure Sharing:** Shared links decrypt entirely in the browser. The decryption key is passed via the URL fragment (`#key`), which is completely invisible to the host server.
- **Browser Extension:** Includes a native extension to seamlessly capture links directly into your secure vault.

## Architecture
- **Worker (`worker/`):** The dumb storage backend.
- **Editor (`apps/editor`):** Your private dashboard to create and manage bundles.
- **Viewer (`apps/viewer`):** The public, read-only interface where shared links are decrypted.
- **Extension (`apps/extension`):** The browser extension.

---

## Quick Deploy Guide
**Prerequisites:** Node.js v18+, a Cloudflare Account, and Wrangler installed (`npx wrangler login`).

### 1. Setup the Backend
Initialize your Cloudflare R2 bucket and deploy the Worker:
```bash
npm install
npx wrangler r2 bucket create parcel-storage
cd worker
npm run deploy
```
*Note the URL it generates for you (e.g., `https://parcel-worker.yourdomain.workers.dev`).*

### 2. Configure Environment Variables
In `apps/editor/`, `apps/viewer/`, and `apps/extension/`, create a `.env.local` file (or append them to your `wrangler.toml` files for production):

```env
# Point this to the Cloudflare Worker URL you just deployed
VITE_API_URL="https://parcel-worker.yourdomain.workers.dev"

# Point this to where you plan to publicly host the Viewer application
VITE_VIEWER_URL="https://viewer.yourdomain.com"
```
*(The Editor requires `VITE_VIEWER_URL` so it natively formats the shareable links you generate!)*

### 3. Deploy the Apps
Build all the frontend applications directly from the root folder:
```bash
npm run build
```

Then deploy the Editor and Viewer:
```bash
# Deploy Editor
cd apps/editor
npx wrangler deploy

# Deploy Viewer
cd ../viewer
npx wrangler deploy
```

### 4. Install the Extension
Load the `apps/extension/dist` folder into Chrome/Brave/Arc as an "Unpacked Extension". It easily utilizes the exact same backend variables to sync securely!

---

## ⚠️ Important Warning
**Don't lose your password.** All encryption strictly happens right on your device. The server literally cannot read your data. If you completely forget your master password, your saved bundles are cryptographically irrecoverable.

---

## License
This project is licensed strictly under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
