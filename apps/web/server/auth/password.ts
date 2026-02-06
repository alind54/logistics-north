import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

function getPepper(): string {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error('PASSWORD_PEPPER must be set and at least 16 characters');
  }
  return pepper;
}

export async function hashPassword(password: string): Promise<string> {
  const pepperedPassword = password + getPepper();
  return bcrypt.hash(pepperedPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const pepperedPassword = password + getPepper();
  try {
    return await bcrypt.compare(pepperedPassword, hash);
  } catch {
    return false;
  }
}
