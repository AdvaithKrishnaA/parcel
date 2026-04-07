import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getValidUrl, getHostname } from './urls.ts';

describe('URL Helpers', () => {
    describe('getValidUrl', () => {
        test('should return the same URL if it is already valid', () => {
            const url = 'https://example.com/path?query=1';
            assert.strictEqual(getValidUrl(url), 'https://example.com/path?query=1');
        });

        test('should return the normalized URL for http', () => {
            const url = 'http://example.com';
            // URL constructor adds trailing slash for base URLs
            assert.strictEqual(getValidUrl(url), 'http://example.com/');
        });

        test('should prefix with https:// if the URL is invalid (missing protocol)', () => {
            const url = 'example.com';
            assert.strictEqual(getValidUrl(url), 'https://example.com');
        });

        test('should handle complex paths without protocol', () => {
            const url = 'example.com/some/path';
            assert.strictEqual(getValidUrl(url), 'https://example.com/some/path');
        });

        test('should handle empty string', () => {
            assert.strictEqual(getValidUrl(''), 'https://');
        });

        test('should neutralize javascript protocol to prevent XSS', () => {
            assert.strictEqual(getValidUrl('javascript:alert("XSS")'), 'https://javascript:alert("XSS")');
            assert.strictEqual(getValidUrl('javascript://alert("XSS")'), 'https://javascript://alert("XSS")');
        });
    });

    describe('getHostname', () => {
        test('should return hostname for valid https URL', () => {
            assert.strictEqual(getHostname('https://example.com/path'), 'example.com');
        });

        test('should return hostname for valid http URL', () => {
            assert.strictEqual(getHostname('http://sub.example.com'), 'sub.example.com');
        });

        test('should return hostname for URL without protocol', () => {
            assert.strictEqual(getHostname('example.com/path'), 'example.com');
        });

        test('should return hostname for subdomain without protocol', () => {
            assert.strictEqual(getHostname('sub.example.com'), 'sub.example.com');
        });

        test('should return the input string if it cannot be parsed as a hostname', () => {
            // This is the fallback behavior in the current implementation
            assert.strictEqual(getHostname('!!!'), '!!!');
        });
    });
});
