## 2025-03-31 - Insecure Randomness in Share Link Generation
**Vulnerability:** The Cloudflare worker was using `Math.random().toString(36)` to generate share IDs for bundles.
**Learning:** `Math.random()` is predictable, and since these share IDs act partly as access tokens when paired with the decryption key, an attacker might be able to guess IDs generated around the same time and attempt access.
**Prevention:** Always use cryptographically secure sources of randomness, such as `crypto.getRandomValues()` (Web Crypto API) or `crypto.randomUUID()`, when generating access identifiers or tokens.

## 2025-03-31 - Potential Cross-Site Scripting (XSS) via javascript: URI
**Vulnerability:** The `getValidUrl` function in the viewer application accepted any valid URL, including those with the `javascript:` protocol, and embedded them directly into anchor tags' `href` attributes.
**Learning:** Even if a string is a "valid URL" according to the `URL` constructor, it may still contain executable code if its protocol is `javascript:`.
**Prevention:** Explicitly validate the protocol of user-provided URLs before using them in sensitive contexts like `href` attributes. Only allow safe protocols like `http:` or `https:`.
