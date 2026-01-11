import crypto from 'crypto';

class MessageEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltRounds = 10000;
  }

  // Generate encryption key from password
  generateKey(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(32);
    }

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.saltRounds, this.keyLength, 'sha256', (err, key) => {
        if (err) reject(err);
        else resolve({ key, salt });
      });
    });
  }

  // Encrypt a message
  async encrypt(message, password) {
    try {
      const { key, salt } = await this.generateKey(password);
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('message')); // Additional authenticated data

      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return encrypted data with metadata
      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      console.error('Message encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt a message
  async decrypt(encryptedData, password) {
    try {
      const { encrypted, iv, salt, authTag, algorithm } = encryptedData;

      const { key } = await this.generateKey(password, Buffer.from(salt, 'hex'));

      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('message'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Message decryption error:', error);
      throw new Error('Failed to decrypt message or invalid password');
    }
  }

  // Generate conversation-specific encryption key
  generateConversationKey(conversationId, userId) {
    const secret = process.env.MESSAGE_ENCRYPTION_SECRET || 'default-secret-change-in-production';
    const data = `${conversationId}:${userId}:${secret}`;
    return crypto.createHash('sha256').update(data).digest();
  }

  // Encrypt message for a specific conversation
  encryptForConversation(message, conversationId, userId) {
    try {
      const key = this.generateConversationKey(conversationId, userId);
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipher('aes-256-cbc', key);
      cipher.setAutoPadding(true);

      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        conversationId,
        userId,
        encrypted: true
      };
    } catch (error) {
      console.error('Conversation message encryption error:', error);
      throw new Error('Failed to encrypt conversation message');
    }
  }

  // Decrypt message from a specific conversation
  decryptFromConversation(encryptedData, conversationId, userId) {
    try {
      const { encrypted, iv } = encryptedData;
      const key = this.generateConversationKey(conversationId, userId);

      const decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Conversation message decryption error:', error);
      throw new Error('Failed to decrypt conversation message');
    }
  }

  // Hash sensitive data (for logging without exposing content)
  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Validate encryption metadata
  validateEncryptionData(encryptionData) {
    const required = ['encrypted', 'iv', 'conversationId', 'userId', 'encrypted'];
    return required.every(field => encryptionData.hasOwnProperty(field));
  }
}

export default new MessageEncryption();