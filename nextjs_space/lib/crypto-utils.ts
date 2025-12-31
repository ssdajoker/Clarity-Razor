/**
 * Client-side cryptography utilities for file security
 * - SHA-256 hashing for integrity verification
 * - AES-256-GCM encryption for file protection
 */

/**
 * Generate SHA-256 hash of a file
 * @param file - File to hash
 * @returns Hex-encoded hash string
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Derive encryption key from password using PBKDF2
 * @param password - User's password
 * @param salt - Salt for key derivation (optional, generates new if not provided)
 * @returns Object with key and salt
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Generate salt if not provided
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES-GCM key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  return { key, salt };
}

/**
 * Encrypt a file with AES-256-GCM
 * @param file - File to encrypt
 * @param password - Encryption password
 * @returns Encrypted file blob and metadata
 */
export async function encryptFile(
  file: File,
  password: string
): Promise<{
  encryptedBlob: Blob;
  salt: string;
  iv: string;
}> {
  const fileBuffer = await file.arrayBuffer();
  
  // Derive key from password
  const { key, salt } = await deriveKey(password);
  
  // Generate initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileBuffer
  );
  
  // Convert to blob
  const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
  
  // Convert salt and iv to hex strings for storage
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    encryptedBlob,
    salt: saltHex,
    iv: ivHex,
  };
}

/**
 * Server-side: Decrypt a file with AES-256-GCM
 * @param encryptedBuffer - Encrypted file buffer
 * @param password - Decryption password
 * @param saltHex - Salt as hex string
 * @param ivHex - IV as hex string
 * @returns Decrypted buffer
 */
export async function decryptFileBuffer(
  encryptedBuffer: ArrayBuffer,
  password: string,
  saltHex: string,
  ivHex: string
): Promise<ArrayBuffer> {
  // Convert hex strings back to Uint8Arrays
  const salt = new Uint8Array(
    saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  const iv = new Uint8Array(
    ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  // Derive key from password and salt
  const { key } = await deriveKey(password, salt);
  
  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedBuffer
  );
  
  return decryptedBuffer;
}

/**
 * Verify file integrity using hash
 * @param file - File to verify
 * @param expectedHash - Expected hash
 * @returns True if hash matches
 */
export async function verifyFileHash(
  file: File | ArrayBuffer,
  expectedHash: string
): Promise<boolean> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHash;
}
