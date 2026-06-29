import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY_HEX = process.env.ENCRYPTION_KEY || '0'.repeat(64) // 32 bytes em hex

function getKey(): Buffer {
  return Buffer.from(KEY_HEX, 'hex')
}

/**
 * Criptografa uma string com AES-256-GCM.
 * Retorna iv:authTag:ciphertext em base64 separados por ':'.
 */
export function encrypt(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)

  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Descriptografa uma string criptografada com encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivB64, tagB64, encB64] = ciphertext.split(':')

  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

/**
 * Criptografa um objeto JSON (para armazenar credenciais no banco).
 */
export function encryptJSON(data: Record<string, unknown>): string {
  return encrypt(JSON.stringify(data))
}

/**
 * Descriptografa e parseia um objeto JSON.
 */
export function decryptJSON<T = Record<string, unknown>>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T
}
