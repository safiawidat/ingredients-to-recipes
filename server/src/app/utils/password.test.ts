import { describe, expect, it } from 'vitest';

import {
  comparePassword,
  hashPassword,
} from './password.js';

const password = 'correct horse battery staple';

describe('password utilities', () => {
  it('hashes a password without returning the plaintext', async () => {
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
  });

  it('accepts the correct password', async () => {
    const hash = await hashPassword(password);

    await expect(comparePassword(password, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword(password);

    await expect(
      comparePassword('incorrect password', hash),
    ).resolves.toBe(false);
  });

  it('uses a unique salt for each hash', async () => {
    const [firstHash, secondHash] = await Promise.all([
      hashPassword(password),
      hashPassword(password),
    ]);

    expect(firstHash).not.toBe(secondHash);
  });
});
