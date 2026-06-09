import { mock, test, describe } from 'node:test';

// Mock hash-wasm before importing the code that uses it
mock.module('hash-wasm', {
  namedExports: {
    argon2id: async () => new Uint8Array(32),
  },
});

import { encryptPayload, decryptPayload, generateKey } from './index.ts';
import assert from 'node:assert';

describe('AES-GCM Encryption', () => {
  test('should encrypt and decrypt a payload correctly', async () => {
    const key = generateKey();
    const data = { message: 'hello world', secret: 123 };

    const encrypted = await encryptPayload(key, data);
    assert.strictEqual(typeof encrypted, 'string');

    const decrypted = await decryptPayload(key, encrypted);
    assert.deepStrictEqual(decrypted, data);
  });

  test('should produce different ciphertexts for the same data and key (due to IV)', async () => {
    const key = generateKey();
    const data = { message: 'hello' };

    const encrypted1 = await encryptPayload(key, data);
    const encrypted2 = await encryptPayload(key, data);

    assert.notStrictEqual(encrypted1, encrypted2);

    const decrypted1 = await decryptPayload(key, encrypted1);
    const decrypted2 = await decryptPayload(key, encrypted2);

    assert.deepStrictEqual(decrypted1, data);
    assert.deepStrictEqual(decrypted2, data);
  });

  test('should fail to decrypt with wrong key', async () => {
    const key1 = generateKey();
    const key2 = generateKey();
    const data = { message: 'secret' };

    const encrypted = await encryptPayload(key1, data);

    await assert.rejects(async () => {
      await decryptPayload(key2, encrypted);
    }, {
      name: 'OperationError'
    });
  });

  test('should fail to decrypt tampered ciphertext', async () => {
    const key = generateKey();
    const data = { message: 'secret' };

    const encrypted = await encryptPayload(key, data);
    // Tamper with the string (it's base64url encoded)
    const tampered = encrypted.substring(0, encrypted.length - 5) + (encrypted.endsWith('a') ? 'b' : 'a');

    await assert.rejects(async () => {
      await decryptPayload(key, tampered);
    }, {
      name: 'OperationError'
    });
  });
});
