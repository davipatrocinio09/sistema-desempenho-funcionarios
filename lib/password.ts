const ITERATIONS = 100_000;

function encode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decode(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt: salt as BufferSource,iterations:ITERATIONS}, key, 256);
  return new Uint8Array(bits);
}

export function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw Error('A senha deve ter entre 10 e 200 caracteres.');
  return password;
}

export async function hashPassword(password: string, encodedSalt?: string) {
  const salt = encodedSalt ? decode(encodedSalt) : crypto.getRandomValues(new Uint8Array(16));
  return {hash: encode(await derive(password, salt)), salt: encode(salt)};
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  const actual = await derive(password, decode(salt)), expected = decode(hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function randomSessionToken() { return encode(crypto.getRandomValues(new Uint8Array(32))); }
export async function sessionTokenHash(token: string) {
  return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}
