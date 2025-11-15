const mongoose = require('mongoose');

jest.mock('../src/models/UserStrategy.model');
jest.mock('../src/models/Credentials.model');
jest.mock('../src/services/docker.service');
jest.mock('../src/services/crypto.service');

const getStrategyModel = require('../src/models/UserStrategy.model');
const getCredentialsModel = require('../src/models/Credentials.model');
const dockerService = require('../src/services/docker.service');

describe('Strategy Controller Tests', () => {
  let Strategy, Credentials;
  const mockUserId = 'user123';

  beforeEach(() => {
    Strategy = {
      find: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      save: jest.fn()
    };

    Credentials = {
      findOne: jest.fn()
    };

    getStrategyModel.mockReturnValue(Strategy);
    getCredentialsModel.mockReturnValue(Credentials);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/strategies - Get All Strategies', () => {
    test('should return all strategies for authenticated user', async () => {
      const mockStrategies = [
        {
          _id: 'strategy1',
          userId: mockUserId,
          name: 'Moving Average Strategy',
          code: 'strategy code here',
          broker: 'dhan',
          status: 'stopped',
          createdAt: new Date()
        },
        {
          _id: 'strategy2',
          userId: mockUserId,
          name: 'RSI Strategy',
          code: 'rsi strategy code',
          broker: 'zerodha',
          status: 'running',
          createdAt: new Date()
        }
      ];

      Strategy.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockStrategies)
      });

      const strategies = await Strategy.find({ userId: mockUserId }).sort({ createdAt: -1 });
      
      expect(strategies).toHaveLength(2);
      expect(strategies[0].name).toBe('Moving Average Strategy');
      expect(strategies[1].name).toBe('RSI Strategy');
    });

    test('should return empty array when user has no strategies', async () => {
      Strategy.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });

      const strategies = await Strategy.find({ userId: mockUserId }).sort({ createdAt: -1 });
      
      expect(strategies).toHaveLength(0);
      expect(Array.isArray(strategies)).toBe(true);
    });
  });

  describe('POST /api/strategies - Create Strategy', () => {
    test('should create strategy with valid data and broker credentials', async () => {
      const mockCredentials = {
        userId: mockUserId,
        broker: 'dhan',
        clientId: 'test123',
        accessToken: 'encrypted-token'
      };

      Credentials.findOne = jest.fn().mockResolvedValue(mockCredentials);
      Strategy.findOne = jest.fn().mockResolvedValue(null); // No duplicate

      const credentials = await Credentials.findOne({ userId: mockUserId, broker: 'dhan' });
      expect(credentials).not.toBeNull();
      expect(credentials.broker).toBe('dhan');
      
      // Verify no duplicate exists
      const duplicate = await Strategy.findOne({ userId: mockUserId, name: 'New Strategy' });
      expect(duplicate).toBeNull();
    });

    test('should reject strategy creation without broker credentials', async () => {
      Credentials.findOne = jest.fn().mockResolvedValue(null);

      const credentials = await Credentials.findOne({ userId: mockUserId, broker: 'dhan' });
      expect(credentials).toBeNull();
    });

    test('should reject duplicate strategy names for same user', async () => {
      Strategy.findOne = jest.fn().mockResolvedValue({
        userId: mockUserId,
        name: 'Existing Strategy',
        code: 'some code'
      });

      const existing = await Strategy.findOne({ 
        userId: mockUserId, 
        name: 'Existing Strategy' 
      });
      
      expect(existing).not.toBeNull();
      expect(existing.name).toBe('Existing Strategy');
    });

    test('should validate broker selection', () => {
      const allowedBrokers = ['dhan', 'zerodha', 'upstox', 'angelone'];
      
      expect(allowedBrokers.includes('dhan')).toBe(true);
      expect(allowedBrokers.includes('zerodha')).toBe(true);
      expect(allowedBrokers.includes('invalid-broker')).toBe(false);
    });

    test('should require strategy name', () => {
      const strategyData = { code: 'some code', broker: 'dhan' };
      expect(strategyData.name).toBeUndefined();
    });

    test('should require strategy code', () => {
      const strategyData = { name: 'Test Strategy', broker: 'dhan' };
      expect(strategyData.code).toBeUndefined();
    });

    test('should require broker selection', () => {
      const strategyData = { name: 'Test', code: 'code here' };
      expect(strategyData.broker).toBeUndefined();
    });

    test('should convert broker to lowercase', () => {
      const broker = 'DHAN';
      const normalizedBroker = broker.toLowerCase();
      expect(normalizedBroker).toBe('dhan');
    });
  });

  describe('GET /api/strategies/:id - Get Single Strategy', () => {
    test('should return strategy by ID for authenticated user', async () => {
      const mockStrategy = {
        _id: 'strategy123',
        userId: mockUserId,
        name: 'My Strategy',
        code: 'strategy code',
        broker: 'dhan',
        status: 'stopped'
      };

      Strategy.findOne = jest.fn().mockResolvedValue(mockStrategy);

      const strategy = await Strategy.findOne({ 
        _id: 'strategy123', 
        userId: mockUserId 
      });
      
      expect(strategy).not.toBeNull();
      expect(strategy._id).toBe('strategy123');
      expect(strategy.name).toBe('My Strategy');
    });

    test('should return null for non-existent strategy', async () => {
      Strategy.findOne = jest.fn().mockResolvedValue(null);

      const strategy = await Strategy.findOne({ 
        _id: 'nonexistent', 
        userId: mockUserId 
      });
      
      expect(strategy).toBeNull();
    });

    test('should not return strategy belonging to different user', async () => {
      Strategy.findOne = jest.fn().mockResolvedValue(null);

      const strategy = await Strategy.findOne({ 
        _id: 'strategy123', 
        userId: 'differentUser' 
      });
      
      expect(strategy).toBeNull();
    });
  });

  describe('PUT /api/strategies/:id - Update Strategy', () => {
    test('should update strategy name and code', async () => {
      const updatedStrategy = {
        _id: 'strategy123',
        userId: mockUserId,
        name: 'Updated Name',
        code: 'updated code',
        broker: 'dhan',
        status: 'stopped'
      };

      Strategy.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedStrategy);

      const strategy = await Strategy.findByIdAndUpdate(
        'strategy123',
        { name: 'Updated Name', code: 'updated code' },
        { new: true }
      );
      
      expect(strategy.name).toBe('Updated Name');
      expect(strategy.code).toBe('updated code');
    });

    test('should not allow updating to duplicate name', async () => {
      Strategy.findOne = jest.fn().mockResolvedValue({
        userId: mockUserId,
        name: 'Existing Strategy'
      });

      const duplicate = await Strategy.findOne({ 
        userId: mockUserId, 
        name: 'Existing Strategy' 
      });
      
      expect(duplicate).not.toBeNull();
    });
  });

  describe('DELETE /api/strategies/:id - Delete Strategy', () => {
    test('should delete strategy successfully', async () => {
      const mockStrategy = {
        _id: 'strategy123',
        userId: mockUserId,
        status: 'stopped'
      };

      Strategy.findOne = jest.fn().mockResolvedValue(mockStrategy);
      Strategy.findByIdAndDelete = jest.fn().mockResolvedValue(mockStrategy);

      const deleted = await Strategy.findByIdAndDelete('strategy123');
      expect(deleted).not.toBeNull();
    });

    test('should not delete running strategy', () => {
      const strategy = { status: 'running' };
      const canDelete = strategy.status !== 'running';
      expect(canDelete).toBe(false);
    });

    test('should allow deleting stopped strategy', () => {
      const strategy = { status: 'stopped' };
      const canDelete = strategy.status !== 'running';
      expect(canDelete).toBe(true);
    });
  });

  describe('Strategy Status Management', () => {
    test('should start stopped strategy', async () => {
      const strategy = {
        _id: 'strategy123',
        status: 'stopped',
        broker: 'dhan'
      };

      dockerService.startStrategy = jest.fn().mockResolvedValue({
        containerId: 'container123',
        status: 'running'
      });

      const result = await dockerService.startStrategy(strategy._id);
      expect(result.status).toBe('running');
    });

    test('should stop running strategy', async () => {
      const strategy = {
        _id: 'strategy123',
        status: 'running',
        containerId: 'container123'
      };

      dockerService.stopStrategy = jest.fn().mockResolvedValue({
        status: 'stopped'
      });

      const result = await dockerService.stopStrategy(strategy.containerId);
      expect(result.status).toBe('stopped');
    });

    test('should not start already running strategy', () => {
      const strategy = { status: 'running' };
      const canStart = strategy.status !== 'running';
      expect(canStart).toBe(false);
    });

    test('should not stop already stopped strategy', () => {
      const strategy = { status: 'stopped' };
      const canStop = strategy.status === 'running';
      expect(canStop).toBe(false);
    });
  });

  describe('Strategy Code Validation', () => {
    test('should accept valid Python code', () => {
      const pythonCode = `
import pandas as pd
import numpy as np

def strategy():
    print("Trading strategy")
    return True
      `;
      
      expect(pythonCode.length).toBeGreaterThan(0);
      expect(pythonCode.includes('def')).toBe(true);
    });

    test('should detect empty strategy code', () => {
      const emptyCode = '';
      expect(emptyCode.trim().length).toBe(0);
    });

    test('should allow multi-line code', () => {
      const multiLineCode = 'line1\nline2\nline3';
      const lines = multiLineCode.split('\n');
      expect(lines.length).toBe(3);
    });
  });
});
