// backend/services/auth/tests/auth.test.js
import request from 'supertest';
import { expect } from 'chai';
import app from '@/index.js';

describe('Auth Service Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal(userData.email);
      expect(response.body.data.tokens.accessToken).to.be.a('string');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1234567891'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.tokens.accessToken).to.be.a('string');
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'WrongPassword123!'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });
  });

  describe('GET /health', () => {
    it('should return service health', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).to.equal('ok');
      expect(response.body.service).to.equal('auth');
    });
  });
});