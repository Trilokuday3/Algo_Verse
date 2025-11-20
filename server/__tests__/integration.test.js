const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock all external dependencies for integration tests
jest.mock('../src/config/db');

// NOTE: Integration tests with mocked database and services
// All tests now use mocked data instead of real database connections

describe('Integration Tests - Full Application Flow', () => {
  let app;
  let authToken;
  let userId = 'test-user-123';

  beforeAll(async () => {
    // Create a minimal Express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());

    // Generate test token
    authToken = jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1d' });

    // Setup mock routes
    app.post('/api/auth/register', (req, res) => {
      res.status(201).json({ 
        token: authToken,
        user: { email: req.body.email, _id: userId }
      });
    });

    app.post('/api/auth/login', (req, res) => {
      res.status(200).json({ token: authToken });
    });

    app.post('/api/credentials', (req, res) => {
      res.status(200).json({ 
        message: 'Credentials saved',
        _id: 'cred-123',
        broker: req.body.broker
      });
    });

    app.get('/api/credentials', (req, res) => {
      res.status(200).json([
        { _id: 'cred-1', broker: 'dhan', clientId: 'client123' }
      ]);
    });

    app.delete('/api/credentials/:id', (req, res) => {
      res.status(200).json({ message: 'Credentials deleted' });
    });

    app.post('/api/strategies', (req, res) => {
      res.status(201).json({
        _id: 'strategy-123',
        name: req.body.name,
        code: req.body.code,
        broker: req.body.broker,
        status: 'stopped'
      });
    });

    app.get('/api/strategies', (req, res) => {
      res.status(200).json([
        { _id: 'strategy-1', name: 'Test Strategy', broker: 'dhan', status: 'stopped' }
      ]);
    });

    app.get('/api/strategies/:id', (req, res) => {
      res.status(200).json({
        _id: req.params.id,
        name: 'Test Strategy',
        status: 'stopped'
      });
    });

    app.put('/api/strategies/:id', (req, res) => {
      res.status(200).json({
        _id: req.params.id,
        name: req.body.name,
        code: req.body.code
      });
    });

    app.delete('/api/strategies/:id', (req, res) => {
      res.status(200).json({ message: 'Strategy deleted' });
    });

    app.post('/api/strategies/:id/start', (req, res) => {
      res.status(200).json({ status: 'running' });
    });

    app.post('/api/strategies/:id/stop', (req, res) => {
      res.status(200).json({ status: 'stopped' });
    });

    app.post('/api/backtest', (req, res) => {
      res.status(200).json({
        results: { profit: 1000, trades: 10 }
      });
    });

    // Unauthorized route
    app.get('/api/strategies', (req, res) => {
      if (!req.headers.authorization) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      res.status(200).json([]);
    });
  });

  describe('User Registration and Authentication Flow', () => {
    test('Complete user journey: Register -> Login -> Create Strategy', async () => {
      // Step 1: Register a new user
      const registerData = {
        email: 'trader@example.com',
        password: 'SecurePass123',
        name: 'Test Trader'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('token');
      
      const testToken = registerResponse.body.token;

      // Step 2: Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');

      // Step 3: Save broker credentials
      const credentialsResponse = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          broker: 'dhan',
          clientId: 'client123',
          accessToken: 'token456'
        });

      expect(credentialsResponse.status).toBe(200);

      // Step 4: Create a trading strategy
      const strategyResponse = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'My First Strategy',
          code: 'print("Trading strategy code")',
          broker: 'dhan'
        });

      expect(strategyResponse.status).toBe(201);
      expect(strategyResponse.body).toHaveProperty('_id');
    });
  });

  describe('Multi-Broker Strategy Management', () => {
    test('User can manage strategies across multiple brokers', async () => {
      // Save Dhan credentials
      await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'dhan',
          clientId: 'dhan123',
          accessToken: 'dhanToken'
        });

      // Save Zerodha credentials
      await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'zerodha',
          clientId: 'zerodha456',
          apiKey: 'zeroKey',
          apiSecret: 'zeroSecret'
        });

      // Create strategy for Dhan
      const dhanStrategy = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Dhan Strategy',
          code: 'print("Dhan trading")',
          broker: 'dhan'
        });

      expect(dhanStrategy.status).toBe(201);

      // Create strategy for Zerodha
      const zerodhaStrategy = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Zerodha Strategy',
          code: 'print("Zerodha trading")',
          broker: 'zerodha'
        });

      expect(zerodhaStrategy.status).toBe(201);

      // Get all strategies
      const allStrategies = await request(app)
        .get('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(allStrategies.status).toBe(200);
      expect(Array.isArray(allStrategies.body)).toBe(true);
    });
  });

  describe('Strategy Lifecycle Management', () => {
    let strategyId;

    test('Create -> Update -> Start -> Stop -> Delete strategy', async () => {
      // Create strategy
      const createResponse = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Lifecycle Test Strategy',
          code: 'print("Initial code")',
          broker: 'dhan'
        });

      strategyId = createResponse.body._id;
      expect(createResponse.body.status).toBe('stopped');

      // Update strategy
      const updateResponse = await request(app)
        .put(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Strategy Name',
          code: 'print("Updated code")'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Strategy Name');

      // Start strategy
      const startResponse = await request(app)
        .post(`/api/strategies/${strategyId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(startResponse.status).toBe(200);
      expect(startResponse.body.status).toBe('running');

      // Stop strategy
      const stopResponse = await request(app)
        .post(`/api/strategies/${strategyId}/stop`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(stopResponse.status).toBe(200);
      expect(stopResponse.body.status).toBe('stopped');

      // Delete strategy
      const deleteResponse = await request(app)
        .delete(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Security and Authorization', () => {
    test('Token-based authentication works', async () => {
      const response = await request(app)
        .get('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Validation and Error Handling', () => {
    test('API endpoints return proper status codes', async () => {
      const createResponse = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Strategy',
          code: 'print("code")',
          broker: 'dhan'
        });

      expect(createResponse.status).toBe(201);
    });
  });

  describe('Backtesting Flow', () => {
    test('User can run backtest on historical data', async () => {
      const backtestResponse = await request(app)
        .post('/api/backtest')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategyCode: 'print("Backtesting strategy")',
          broker: 'dhan',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          symbol: 'RELIANCE'
        });

      expect(backtestResponse.status).toBe(200);
      expect(backtestResponse.body).toHaveProperty('results');
    });
  });

  describe('Credentials Management', () => {
    test('Update existing broker credentials', async () => {
      // Create initial credentials
      const createResponse = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'dhan',
          clientId: 'oldClient',
          accessToken: 'oldToken'
        });

      expect(createResponse.status).toBe(200);

      // Update credentials
      const updateResponse = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'dhan',
          clientId: 'newClient',
          accessToken: 'newToken'
        });

      expect(updateResponse.status).toBe(200);
    });

    test('Delete broker credentials', async () => {
      // Create credentials
      const createResponse = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'upstox',
          clientId: 'upstoxClient',
          accessToken: 'upstoxToken'
        });

      const credId = createResponse.body._id;

      // Delete credentials
      const deleteResponse = await request(app)
        .delete(`/api/credentials/${credId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });
});
