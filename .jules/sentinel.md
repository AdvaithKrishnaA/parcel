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

## 2024-05-24 - [Increase Entropy of Shared Link Identifiers]
**Vulnerability:** The Cloudflare worker generated shared link IDs using only 4 bytes (8 hex characters) of entropy.
**Learning:** Shared link IDs that serve as partial access tokens and are vulnerable to brute-force enumeration attacks must have a high level of entropy (at least 128 bits / 16 bytes) to be cryptographically secure. The ID entropy is the main defense against an attacker trying to guess URLs in order to gain access to or identify the existence of shared collections.
**Prevention:** Always use at least 16 bytes (128 bits) of entropy generated via `crypto.getRandomValues()` for resource identifiers that serve as access control capabilities.
