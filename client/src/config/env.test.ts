import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from './env';

describe('resolveApiBaseUrl', () => {
  it('normalizes an explicit API base URL', () => {
    expect(
      resolveApiBaseUrl('https://api.example.test/api/v1///', true),
    ).toBe('https://api.example.test/api/v1');
  });

  it('uses the same-origin API path for a production build without a value', () => {
    expect(resolveApiBaseUrl(undefined, true)).toBe('/api/v1');
    expect(resolveApiBaseUrl('   ', true)).toBe('/api/v1');
  });

  it('preserves the localhost fallback for development', () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe(
      'http://localhost:3000/api/v1',
    );
  });
});
