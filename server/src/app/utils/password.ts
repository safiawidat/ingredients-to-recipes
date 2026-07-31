import bcrypt from 'bcryptjs';

const PASSWORD_SALT_ROUNDS = 12;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

export const comparePassword = (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);
