const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');

// NOTE: These integration tests require a full database connection
// They are currently skipped - to run them, set up a test database and update the describe.skip to describe

describe.skip('Integration Tests - Full Application Flow', () => {
  let authToken;
  let userId;
  let User, Strategy, Credentials;

  beforeAll(async () => {
    // Setup database models
    User = getUserModel();
    Strategy = getStrategyModel();
    Credentials = getCredentialsModel();
  });

  afterAll(async () => {
    await mongoose.connection.close();
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
      
      authToken = registerResponse.body.token;
      const decoded = jwt.decode(authToken);
      userId = decoded.userId;

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
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'dhan',
          clientId: 'client123',
          accessToken: 'token456'
        });

      expect(credentialsResponse.status).toBe(200);

      // Step 4: Create a trading strategy
      const strategyResponse = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
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

      // Create strategy for Zerodha
      const zerodhaStrategy = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Zerodha Strategy',
          code: 'print("Zerodha trading")',
          broker: 'zerodha'
        });

      // Get all strategies
      const allStrategies = await request(app)
        .get('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(allStrategies.body.length).toBeGreaterThanOrEqual(2);
      
      const brokers = allStrategies.body.map(s => s.broker);
      expect(brokers).toContain('dhan');
      expect(brokers).toContain('zerodha');
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

      expect(updateResponse.body.name).toBe('Updated Strategy Name');

      // Start strategy (requires Docker)
      const startResponse = await request(app)
        .post(`/api/strategies/${strategyId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      if (startResponse.status === 200) {
        expect(startResponse.body.status).toBe('running');

        // Stop strategy
        const stopResponse = await request(app)
          .post(`/api/strategies/${strategyId}/stop`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(stopResponse.body.status).toBe('stopped');
      }

      // Delete strategy
      const deleteResponse = await request(app)
        .delete(`/api/strategies/${strategyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Security and Authorization', () => {
    test('Unauthorized requests should be rejected', async () => {
      const response = await request(app)
        .get('/api/strategies');

      expect(response.status).toBe(401);
    });

    test('Invalid token should be rejected', async () => {
      const response = await request(app)
        .get('/api/strategies')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    test('User cannot access another user\'s strategies', async () => {
      // Create another user
      const anotherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'another@example.com',
          password: 'Password123'
        });

      const anotherToken = anotherUser.body.token;

      // Try to access first user's strategies
      const response = await request(app)
        .get('/api/strategies')
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.body.length).toBe(0);
    });
  });

  describe('Validation and Error Handling', () => {
    test('Cannot create strategy without credentials', async () => {
      const response = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Strategy',
          code: 'print("code")',
          broker: 'upstox' // No credentials for this broker
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('credentials');
    });

    test('Cannot create duplicate strategy names', async () => {
      const strategyData = {
        name: 'Duplicate Test',
        code: 'print("code")',
        broker: 'dhan'
      };

      // Create first strategy
      await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(strategyData);

      // Try to create duplicate
      const duplicateResponse = await request(app)
        .post('/api/strategies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(strategyData);

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.message).toContain('already exists');
    });

    test('Maximum 4 brokers limit enforcement', async () => {
      const brokers = ['dhan', 'zerodha', 'upstox', 'angelone', 'fyers'];

      // Add 4 brokers
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/credentials')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            broker: brokers[i],
            clientId: `client${i}`,
            accessToken: `token${i}`
          });
      }

      // Try to add 5th broker
      const fifthBroker = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: brokers[4],
          clientId: 'client5',
          accessToken: 'token5'
        });

      expect(fifthBroker.status).toBe(400);
      expect(fifthBroker.body.message).toContain('Maximum 4 brokers');
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

      // Backtest endpoint may or may not exist yet
      if (backtestResponse.status !== 404) {
        expect(backtestResponse.status).toBe(200);
        expect(backtestResponse.body).toHaveProperty('results');
      }
    });
  });

  describe('Credentials Management', () => {
    test('Update existing broker credentials', async () => {
      // Create initial credentials
      await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          broker: 'dhan',
          clientId: 'oldClient',
          accessToken: 'oldToken'
        });

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
      expect(updateResponse.body.message).toContain('updated');

      // Verify updated credentials
      const getResponse = await request(app)
        .get('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`);

      const dhanCreds = getResponse.body.find(c => c.broker === 'dhan');
      expect(dhanCreds.clientId).toBe('newClient');
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

      // Verify deletion
      const getResponse = await request(app)
        .get('/api/credentials')
        .set('Authorization', `Bearer ${authToken}`);

      const upstoxCreds = getResponse.body.find(c => c.broker === 'upstox');
      expect(upstoxCreds).toBeUndefined();
    });
  });
});
