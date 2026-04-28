## 2024-05-18 - [Weak Random Number Generation for Share IDs]
**Vulnerability:** Share IDs were generated using only 4 bytes (8 characters) of randomness, making them susceptible to brute-force enumeration.
**Learning:** The previous implementation used `crypto.getRandomValues(new Uint8Array(4))`, providing an insufficient 4.29 billion possible IDs, increasing the risk of collisions and unauthorized access to shared links.
**Prevention:** Increase the byte array length to 16 bytes (`crypto.getRandomValues(new Uint8Array(16))`) to ensure cryptographically secure, 32-character random IDs that effectively prevent brute-force attacks.

## 2024-05-18 - [Overly Permissive CORS Configuration]
**Vulnerability:** The CORS configuration allowed any origin (`Access-Control-Allow-Origin: *`) to make requests, potentially leading to unauthorized access.
**Learning:** Returning a wildcard origin globally is overly permissive and should be restricted.
**Prevention:** Implement dynamic CORS origin validation using an `ALLOWED_ORIGINS` environment variable and return `Vary: Origin` to ensure only whitelisted origins can interact with the API.
