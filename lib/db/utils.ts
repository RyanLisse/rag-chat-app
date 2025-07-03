import { genSaltSync, hashSync } from 'bcrypt-ts';

export function generateHashedPassword(password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return hash;
}

export function generateDummyPassword() {
  // Generate random password using crypto instead of generateId(length) which was removed in AI SDK 5.0
  const password = Math.random().toString(36).substring(2, 14);
  const hashedPassword = generateHashedPassword(password);

  return hashedPassword;
}
