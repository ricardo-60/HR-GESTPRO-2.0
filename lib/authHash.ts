/**
 * Módulo de Hash de Password Seguro para Autenticação Offline
 *
 * Utiliza a Web Crypto API (SubtleCrypto) — disponível em browsers modernos
 * e no Electron — para derivar e verificar passwords com PBKDF2 + HMAC.
 * Nenhuma dependência externa necessária.
 *
 * Estratégia:
 *   1. No primeiro login ONLINE bem-sucedido: derivamos PBKDF2(password, salt)
 *      e armazenamos o hash (base64) + salt (base64) localmente.
 *   2. No login OFFLINE: derivamos PBKDF2(password_input, salt_guardado) e
 *      comparamos com o hash guardado.
 *
 * PBKDF2 iterations: 600 000 (OWASP recommended minimum)
 * Salt: 16 bytes aleatórios
 * Hash length: 32 bytes (SHA-256)
 */

// Número de iterações PBKDF2 — 600k é o mínimo OWASP 2024 recomendado
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

/**
 * Gera bytes aleatórios seguros para usar como salt.
 * crypto.getRandomValues está disponível em todos os browsers modernos
 * e no Chromium do Electron (versão 40+).
 */
function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTES);
  // crypto.getRandomValues é standard Web API, disponível em browser e Electron
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Codifica um ArrayBuffer para base64 URL-safe (sem padding).
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Descodifica uma string base64 (URL-safe ou standard) para Uint8Array.
 */
function base64ToBuffer(base64: string): Uint8Array {
  // Restaurar padding e caracteres standard
  let cleaned = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (cleaned.length % 4 !== 0) cleaned += '=';
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Importa a password como material de chave para o SubtleCrypto.
 */
async function importPassword(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(password.normalize('NFKC'));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
}

/**
 * Deriva bits a partir da password e salt usando PBKDF2-SHA256.
 */
async function deriveBits(passwordKey: CryptoKey, salt: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    HASH_BYTES * 8
  );
}

/**
 * Cria um hash de password seguro e retorna { hash, salt } em base64.
 *
 * Uso:
 *   const { hash, salt } = await createPasswordHash('minha_senha');
 *   // Guardar hash e salt na base de dados local
 */
export async function createPasswordHash(password: string): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt();
  const key = await importPassword(password);
  const derivedBits = await deriveBits(key, salt);
  return {
    hash: bufferToBase64(derivedBits),
    salt: bufferToBase64(salt.buffer),
  };
}

/**
 * Verifica se uma password corresponde a um hash + salt guardados.
 *
 * Uso:
 *   const isMatch = await verifyPassword('minha_senha', hashGuardado, saltGuardado);
 *   // isMatch === true | false
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const saltBytes = base64ToBuffer(storedSalt);
    const key = await importPassword(password);
    const derivedBits = await deriveBits(key, saltBytes);
    const computedHash = bufferToBase64(derivedBits);
    // Comparação em tempo constante para evitar timing attacks
    return timingSafeEqual(computedHash, storedHash);
  } catch {
    return false;
  }
}

/**
 * Comparação em tempo constante de duas strings base64.
 * Previne timing attacks que poderiam extrair o hash caracter a caracter.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Gera um ID de sessão offline único (32 bytes aleatórios).
 */
export function generateOfflineSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToBase64(bytes.buffer);
}
