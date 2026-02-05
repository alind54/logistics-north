import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

function getPepper(): string {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error('PASSWORD_PEPPER must be set and at least 16 characters');
  }
  return pepper;
}

export async function hashPassword(password: string): Promise<string> {
  const pepperedPassword = password + getPepper();
  return argon2.hash(pepperedPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const pepperedPassword = password + getPepper();
  try {
    return await argon2.verify(hash, pepperedPassword);
  } catch {
    return false;
  }
}
