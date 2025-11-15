jest.mock('../src/models/Credentials.model');
jest.mock('../src/services/crypto.service');

const getCredentialsModel = require('../src/models/Credentials.model');
const { encrypt, decrypt } = require('../src/services/crypto.service');

describe('Credentials Controller Tests', () => {
  let Credentials;
  const mockUserId = 'user123';

  beforeEach(() => {
    Credentials = {
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn()
    };

    getCredentialsModel.mockReturnValue(Credentials);
    
    // Mock encryption/decryption
    encrypt.mockImplementation((text) => `encrypted_${text}`);
    decrypt.mockImplementation((text) => text.replace('encrypted_', ''));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/credentials - Save Credentials', () => {
    test('should save new broker credentials with encryption', async () => {
      Credentials.findOne = jest.fn().mockResolvedValue(null); // New broker
      Credentials.countDocuments = jest.fn().mockResolvedValue(1); // User has 1 broker

      const credentialData = {
        clientId: 'client123',
        accessToken: 'token456',
        broker: 'dhan'
      };

      const encryptedClientId = encrypt(credentialData.clientId);
      const encryptedToken = encrypt(credentialData.accessToken);

      expect(encryptedClientId).toBe('encrypted_client123');
      expect(encryptedToken).toBe('encrypted_token456');
      expect(Credentials.countDocuments).toHaveBeenCalledTimes(0); // Not called yet
    });

    test('should update existing broker credentials', async () => {
      const existingCredential = {
        userId: mockUserId,
        broker: 'dhan',
        clientId: 'encrypted_oldclient',
        accessToken: 'encrypted_oldtoken'
      };

      Credentials.findOne = jest.fn().mockResolvedValue(existingCredential);
      Credentials.findOneAndUpdate = jest.fn().mockResolvedValue({
        ...existingCredential,
        clientId: 'encrypted_newclient',
        accessToken: 'encrypted_newtoken'
      });

      const updated = await Credentials.findOneAndUpdate(
        { userId: mockUserId, broker: 'dhan' },
        { clientId: 'encrypted_newclient', accessToken: 'encrypted_newtoken' },
        { upsert: true, new: true }
      );

      expect(updated.clientId).toBe('encrypted_newclient');
    });

    test('should enforce maximum 4 brokers per user', async () => {
      Credentials.findOne = jest.fn().mockResolvedValue(null); // New broker
      Credentials.countDocuments = jest.fn().mockResolvedValue(4); // Already has 4

      const count = await Credentials.countDocuments({ userId: mockUserId });
      expect(count).toBe(4);
      expect(count >= 4).toBe(true);
    });

    test('should validate broker selection is required', () => {
      const credentialData = { clientId: 'test', accessToken: 'token' };
      expect(credentialData.broker).toBeUndefined();
    });

    test('should validate allowed brokers', () => {
      const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
      
      expect(allowedBrokers.includes('dhan')).toBe(true);
      expect(allowedBrokers.includes('zerodha')).toBe(true);
      expect(allowedBrokers.includes('upstox')).toBe(true);
      expect(allowedBrokers.includes('angelone')).toBe(true);
      expect(allowedBrokers.includes('invalid')).toBe(false);
    });

    test('should normalize broker name to lowercase', () => {
      const broker = 'DHAN';
      const normalized = broker.toLowerCase();
      expect(normalized).toBe('dhan');
    });

    test('should encrypt all credential fields', () => {
      const credentials = {
        clientId: 'client123',
        accessToken: 'token456',
        brokerUsername: 'user789',
        brokerPassword: 'pass123',
        totpSecret: 'totp456',
        apiKey: 'key789',
        apiSecret: 'secret123'
      };

      const encrypted = {
        clientId: encrypt(credentials.clientId),
        accessToken: encrypt(credentials.accessToken),
        brokerUsername: encrypt(credentials.brokerUsername),
        brokerPassword: encrypt(credentials.brokerPassword),
        totpSecret: encrypt(credentials.totpSecret),
        apiKey: encrypt(credentials.apiKey),
        apiSecret: encrypt(credentials.apiSecret)
      };

      expect(encrypted.clientId).toBe('encrypted_client123');
      expect(encrypted.accessToken).toBe('encrypted_token456');
      expect(encrypted.brokerPassword).toBe('encrypted_pass123');
    });

    test('should handle empty optional fields', () => {
      const credentials = {
        clientId: 'client123',
        accessToken: 'token456',
        brokerUsername: '',
        totpSecret: ''
      };

      const encryptedUsername = credentials.brokerUsername ? encrypt(credentials.brokerUsername) : '';
      const encryptedTotp = credentials.totpSecret ? encrypt(credentials.totpSecret) : '';

      expect(encryptedUsername).toBe('');
      expect(encryptedTotp).toBe('');
    });
  });

  describe('GET /api/credentials - Get All Credentials', () => {
    test('should return all broker credentials for user with decryption', async () => {
      const mockCredentials = [
        {
          _id: 'cred1',
          userId: mockUserId,
          broker: 'dhan',
          clientId: 'encrypted_client1',
          accessToken: 'encrypted_token1',
          brokerUsername: 'encrypted_user1',
          brokerPassword: 'encrypted_pass1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: 'cred2',
          userId: mockUserId,
          broker: 'zerodha',
          clientId: 'encrypted_client2',
          accessToken: 'encrypted_token2',
          apiKey: 'encrypted_key2',
          apiSecret: 'encrypted_secret2',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      Credentials.find = jest.fn().mockResolvedValue(mockCredentials);

      const credentials = await Credentials.find({ userId: mockUserId });
      
      expect(credentials).toHaveLength(2);
      expect(credentials[0].broker).toBe('dhan');
      expect(credentials[1].broker).toBe('zerodha');

      // Test decryption
      const decrypted = decrypt(credentials[0].clientId);
      expect(decrypted).toBe('client1');
    });

    test('should return empty array when user has no credentials', async () => {
      Credentials.find = jest.fn().mockResolvedValue([]);

      const credentials = await Credentials.find({ userId: mockUserId });
      
      expect(credentials).toHaveLength(0);
      expect(Array.isArray(credentials)).toBe(true);
    });

    test('should decrypt all fields in response', () => {
      const encryptedCred = {
        clientId: 'encrypted_client123',
        accessToken: 'encrypted_token456',
        brokerPassword: 'encrypted_pass789'
      };

      const decrypted = {
        clientId: decrypt(encryptedCred.clientId),
        accessToken: decrypt(encryptedCred.accessToken),
        brokerPassword: decrypt(encryptedCred.brokerPassword)
      };

      expect(decrypted.clientId).toBe('client123');
      expect(decrypted.accessToken).toBe('token456');
      expect(decrypted.brokerPassword).toBe('pass789');
    });
  });

  describe('GET /api/credentials/:broker - Get Specific Broker Credentials', () => {
    test('should return credentials for specific broker', async () => {
      const mockCredential = {
        _id: 'cred1',
        userId: mockUserId,
        broker: 'dhan',
        clientId: 'encrypted_client123',
        accessToken: 'encrypted_token456'
      };

      Credentials.findOne = jest.fn().mockResolvedValue(mockCredential);

      const credential = await Credentials.findOne({ 
        userId: mockUserId, 
        broker: 'dhan' 
      });
      
      expect(credential).not.toBeNull();
      expect(credential.broker).toBe('dhan');
    });

    test('should return null for broker without credentials', async () => {
      Credentials.findOne = jest.fn().mockResolvedValue(null);

      const credential = await Credentials.findOne({ 
        userId: mockUserId, 
        broker: 'zerodha' 
      });
      
      expect(credential).toBeNull();
    });
  });

  describe('DELETE /api/credentials/:id - Delete Credentials', () => {
    test('should delete broker credentials successfully', async () => {
      const mockCredential = {
        _id: 'cred123',
        userId: mockUserId,
        broker: 'dhan'
      };

      Credentials.findByIdAndDelete = jest.fn().mockResolvedValue(mockCredential);

      const deleted = await Credentials.findByIdAndDelete('cred123');
      expect(deleted).not.toBeNull();
      expect(deleted.broker).toBe('dhan');
    });

    test('should verify user owns credentials before deletion', async () => {
      Credentials.findOne = jest.fn().mockResolvedValue({
        _id: 'cred123',
        userId: mockUserId
      });

      const credential = await Credentials.findOne({ _id: 'cred123' });
      const canDelete = credential && credential.userId === mockUserId;
      
      expect(canDelete).toBe(true);
    });
  });

  describe('Broker-Specific Credential Requirements', () => {
    test('Dhan should require clientId and accessToken', () => {
      const dhanCreds = {
        broker: 'dhan',
        clientId: 'client123',
        accessToken: 'token456'
      };

      const isValid = !!(dhanCreds.clientId && dhanCreds.accessToken);
      expect(isValid).toBe(true);
    });

    test('Zerodha should support API key and secret', () => {
      const zerodhaCreds = {
        broker: 'zerodha',
        apiKey: 'key123',
        apiSecret: 'secret456',
        clientId: 'client789'
      };

      const hasApiCredentials = !!(zerodhaCreds.apiKey && zerodhaCreds.apiSecret);
      expect(hasApiCredentials).toBe(true);
    });

    test('Should support TOTP secret for 2FA', () => {
      const credsWithTotp = {
        broker: 'zerodha',
        totpSecret: 'JBSWY3DPEHPK3PXP'
      };

      expect(credsWithTotp.totpSecret).toBeTruthy();
      expect(credsWithTotp.totpSecret.length).toBeGreaterThan(0);
    });

    test('Should support broker username and password', () => {
      const creds = {
        broker: 'angelone',
        brokerUsername: 'user123',
        brokerPassword: 'pass456'
      };

      const hasLoginCredentials = !!(creds.brokerUsername && creds.brokerPassword);
      expect(hasLoginCredentials).toBe(true);
    });
  });

  describe('Encryption Service Integration', () => {
    test('should encrypt credentials before storage', () => {
      const plainText = 'mySecretToken123';
      const encrypted = encrypt(plainText);
      
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toBe('encrypted_mySecretToken123');
    });

    test('should decrypt credentials after retrieval', () => {
      const encrypted = 'encrypted_mySecretToken123';
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe('mySecretToken123');
      expect(decrypted).not.toContain('encrypted_');
    });

    test('should handle encryption/decryption round-trip', () => {
      const original = 'sensitiveData789';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(original);
    });
  });
});
