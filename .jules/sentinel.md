## 2025-03-31 - Insecure Randomness in Share Link Generation
**Vulnerability:** The Cloudflare worker was using `Math.random().toString(36)` to generate share IDs for bundles.
**Learning:** `Math.random()` is predictable, and since these share IDs act partly as access tokens when paired with the decryption key, an attacker might be able to guess IDs generated around the same time and attempt access.
**Prevention:** Always use cryptographically secure sources of randomness, such as `crypto.getRandomValues()` (Web Crypto API) or `crypto.randomUUID()`, when generating access identifiers or tokens.

## 2025-03-31 - Potential Cross-Site Scripting (XSS) via javascript: URI
**Vulnerability:** The `getValidUrl` function in the viewer application accepted any valid URL, including those with the `javascript:` protocol, and embedded them directly into anchor tags' `href` attributes.
**Learning:** Even if a string is a "valid URL" according to the `URL` constructor, it may still contain executable code if its protocol is `javascript:`.
**Prevention:** Explicitly validate the protocol of user-provided URLs before using them in sensitive contexts like `href` attributes. Only allow safe protocols like `http:` or `https:`.

## 2026-04-14 - Error Handling and Security Headers in Worker
**Vulnerability:** The Cloudflare worker leaked error details to the client on failure and lacked strict security headers.
**Learning:** Exposing raw error details () on 500 errors can reveal internal infrastructure or logical workings. Additionally, API endpoints must use standard security headers to prevent attacks like clickjacking and XSS framing.
**Prevention:** Use a generic error message (e.g., 'Internal Server Error') for HTTP 500 responses, while logging the specific error internally (). Ensure responses include strict security headers like , , , and .

## 2025-03-31 - Error Handling and Security Headers in Worker
**Vulnerability:** The Cloudflare worker leaked error details to the client on failure and lacked strict security headers.
**Learning:** Exposing raw error details (`e.message`) on 500 errors can reveal internal infrastructure or logical workings. Additionally, API endpoints must use standard security headers to prevent attacks like clickjacking and XSS framing.
**Prevention:** Use a generic error message (e.g., 'Internal Server Error') for HTTP 500 responses, while logging the specific error internally (`console.error`). Ensure responses include strict security headers like `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, and `Strict-Transport-Security`.

## 2026-04-21 - Overly Permissive CORS Configuration
**Vulnerability:** The Cloudflare worker previously used a static CORS configuration with `Access-Control-Allow-Origin: *`.
**Learning:** Using a wildcard for allowed origins exposes the API to requests from any domain, which increases the risk of unauthorized access or abuse, especially if the API lacks other robust authentication layers for some endpoints.
**Prevention:** Implement dynamic CORS origin validation by checking the request's `Origin` header against a whitelist of `ALLOWED_ORIGINS` configured in the environment variables, and return `Vary: Origin` to ensure correct caching behavior.
