const request = require('supertest');
const express = require('express');

// Mock Express App for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Sample route for testing
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });
  
  return app;
};

describe('API Health Check', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('healthy');
  });
});

describe('Sample Unit Tests', () => {
  test('Math operations work correctly', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
  });
  
  test('String operations work correctly', () => {
    const str = 'Hello World';
    expect(str.toLowerCase()).toBe('hello world');
    expect(str.includes('World')).toBe(true);
  });
  
  test('Array operations work correctly', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr.includes(3)).toBe(true);
    expect(arr[0]).toBe(1);
  });
});

describe('Object Tests', () => {
  test('Object creation and properties', () => {
    const user = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user.name).toBe('Test User');
  });
});
