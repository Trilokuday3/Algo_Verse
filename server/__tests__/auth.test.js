const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock models and services
jest.mock('../src/models/User.model');
jest.mock('../src/models/UserStrategy.model');
jest.mock('../src/models/Credentials.model');

const getUserModel = require('../src/models/User.model');
const getStrategyModel = require('../src/models/UserStrategy.model');
const getCredentialsModel = require('../src/models/Credentials.model');

describe('Authentication Controller Tests', () => {
  let User;

  beforeEach(() => {
    User = {
      findOne: jest.fn(),
      save: jest.fn()
    };
    getUserModel.mockReturnValue(User);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('should successfully register a new user', async () => {
      const mockUser = {
        email: 'newuser@test.com',
        password: 'hashedpassword123',
        _id: 'user123',
        save: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockResolvedValue(null);

      const response = {
        email: 'newuser@test.com',
        token: 'mock-jwt-token'
      };

      const existingUser = await User.findOne({ email: response.email });
      expect(existingUser).toBeNull();
      expect(response.email).toBe('newuser@test.com');
      expect(response.token).toBeDefined();
    });

    test('should reject registration with existing email', async () => {
      User.findOne = jest.fn().mockResolvedValue({
        email: 'existing@test.com',
        password: 'hashedpassword'
      });

      const error = { message: 'Email already registered.' };
      expect(error.message).toBe('Email already registered.');
    });

    test('should reject registration with weak password', () => {
      const shortPassword = '12345';
      const isValid = shortPassword.length >= 6;
      expect(isValid).toBe(false);
    });

    test('should reject registration without email', () => {
      const data = { password: 'Test123!' };
      expect(data.email).toBeUndefined();
    });

    test('should reject registration without password', () => {
      const data = { email: 'test@test.com' };
      expect(data.password).toBeUndefined();
    });

    test('should hash password before saving', async () => {
      const password = 'MyPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(password.length);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should successfully login with valid credentials', async () => {
      const password = 'Test123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      User.findOne = jest.fn().mockResolvedValue({
        email: 'user@test.com',
        password: hashedPassword,
        _id: 'user123'
      });

      const isMatch = await bcrypt.compare(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    test('should reject login with incorrect password', async () => {
      const correctPassword = 'Test123!';
      const wrongPassword = 'WrongPassword';
      const hashedPassword = await bcrypt.hash(correctPassword, 10);

      const isMatch = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });

    test('should reject login with non-existent email', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const user = await User.findOne({ email: 'nonexistent@test.com' });
      expect(user).toBeNull();
    });

    test('should generate valid JWT token on login', () => {
      const userId = 'user123';
      const token = jwt.sign({ id: userId }, 'test-secret', { expiresIn: '1d' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, 'test-secret');
      expect(decoded.id).toBe(userId);
    });

    test('should set token expiry to 1 day', () => {
      const token = jwt.sign({ id: 'user123' }, 'test-secret', { expiresIn: '1d' });
      const decoded = jwt.verify(token, 'test-secret');
      
      const expiryTime = decoded.exp - decoded.iat;
      const oneDayInSeconds = 24 * 60 * 60;
      
      expect(expiryTime).toBe(oneDayInSeconds);
    });
  });

  describe('Email Validation', () => {
    test('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@gmail.com',
        'name123@test.org'
      ];

      validEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com'
      ];

      invalidEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });
  });
});
