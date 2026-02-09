import crypto from "crypto";

// Generate a secure random salt
export function generateSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Hash data using SHA-256 with salt
export function hashWithSalt(data: string, salt: string): string {
  const hash = crypto.createHmac("sha256", salt);
  hash.update(data);
  return hash.digest("hex");
}

// Hash face embedding data with salt
// Since face embeddings are float arrays, we need to serialize them first
export function hashFaceEmbedding(embedding: number[], salt: string): string {
  // Convert embedding array to a consistent string representation
  const embeddingString = embedding.map(n => n.toFixed(10)).join(",");
  return hashWithSalt(embeddingString, salt);
}

// Verify if an embedding matches a stored hash
// Note: For face embeddings, we typically don't verify exact matches
// Instead, we compute similarity/distance between embeddings
// This function is for data integrity verification
export function verifyEmbeddingHash(embedding: number[], salt: string, storedHash: string): boolean {
  const computedHash = hashFaceEmbedding(embedding, salt);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

// Encrypt data using AES-256-GCM (for at-rest encryption)
export function encryptData(data: string, key: string): { encrypted: string; iv: string; authTag: string } {
  // Derive a key from the secret using deployment-specific salt
  const salt = process.env.ENCRYPTION_SALT || process.env.NEXTAUTH_SECRET || "ams-deployment-salt";
  const derivedKey = crypto.pbkdf2Sync(key, salt, 600000, 32, "sha256");
  
  // Generate a random IV
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);
  
  // Encrypt
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Decrypt data using AES-256-GCM
export function decryptData(encryptedData: string, iv: string, authTag: string, key: string): string {
  // Derive the same key using deployment-specific salt
  const salt = process.env.ENCRYPTION_SALT || process.env.NEXTAUTH_SECRET || "ams-deployment-salt";
  const derivedKey = crypto.pbkdf2Sync(key, salt, 600000, 32, "sha256");
  
  // Create decipher
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    derivedKey,
    Buffer.from(iv, "hex")
  );
  
  // Set auth tag
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  
  // Decrypt
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

// Encrypt face embedding for storage
export function encryptFaceEmbedding(embedding: number[]): {
  encryptedEmbedding: string;
  iv: string;
  authTag: string;
  salt: string;
  hash: string;
} {
  const encryptionKey = process.env.BIOMETRIC_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!encryptionKey) {
    throw new Error("BIOMETRIC_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set for biometric encryption");
  }
  const salt = generateSalt();
  
  // Serialize embedding
  const embeddingString = JSON.stringify(embedding);
  
  // Encrypt
  const { encrypted, iv, authTag } = encryptData(embeddingString, encryptionKey);
  
  // Also create a hash for integrity verification
  const hash = hashFaceEmbedding(embedding, salt);
  
  return {
    encryptedEmbedding: encrypted,
    iv,
    authTag,
    salt,
    hash,
  };
}

// Decrypt face embedding for use
export function decryptFaceEmbedding(
  encryptedEmbedding: string,
  iv: string,
  authTag: string
): number[] {
  const encryptionKey = process.env.BIOMETRIC_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!encryptionKey) {
    throw new Error("BIOMETRIC_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set for biometric decryption");
  }
  
  const decrypted = decryptData(encryptedEmbedding, iv, authTag, encryptionKey);
  return JSON.parse(decrypted);
}

// Generate a secure credential ID for WebAuthn
export function generateCredentialId(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// Hash credential ID for storage (one-way)
export function hashCredentialId(credentialId: string): string {
  return crypto.createHash("sha256").update(credentialId).digest("hex");
}
