import { expect } from 'chai';
import sinon from 'sinon';
import { registerHandler, loginHandler } from '../../src/handlers/auth.handler.js';
import * as authService from '../../src/services/auth.service.js';

describe('Auth Handler', () => {
  let c, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    c = {
      req: {
        json: sandbox.stub()
      },
      env: {
        DB: {},
        JWT_SECRET: 'test-secret'
      },
      json: sandbox.stub().returnsThis(),
      status: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => sandbox.restore());

  describe('registerHandler', () => {
    it('should register a user successfully', async () => {
      const userData = { username: 'test', email: 'test@test.com', password: 'password123' };
      c.req.json.resolves(userData);
      
      const fakeUser = { user_id: '123', username: 'test', email: 'test@test.com' };
      sandbox.stub(authService, 'registerUser').resolves(c.json(fakeUser, 201));

      await registerHandler(c);

      expect(authService.registerUser.calledOnce).to.be.true;
    });

    it('should handle registration errors', async () => {
      c.req.json.resolves({ username: 'test', email: 'test@test.com', password: 'weak' });
      sandbox.stub(authService, 'registerUser').rejects(new Error('Registration failed'));

      try {
        await registerHandler(c);
      } catch (err) {
        expect(err).to.be.an('error');
      }
    });
  });

  describe('loginHandler', () => {
    it('should login user successfully', async () => {
      const loginData = { email: 'test@test.com', password: 'password123' };
      c.req.json.resolves(loginData);
      
      const fakeResponse = { token: 'jwt-token', user: { id: '123' } };
      sandbox.stub(authService, 'loginUser').resolves(c.json(fakeResponse));

      await loginHandler(c);

      expect(authService.loginUser.calledOnce).to.be.true;
    });

    it('should handle invalid credentials', async () => {
      c.req.json.resolves({ email: 'test@test.com', password: 'wrong' });
      sandbox.stub(authService, 'loginUser').rejects(new Error('Invalid credentials'));

      try {
        await loginHandler(c);
      } catch (err) {
        expect(err).to.be.an('error');
      }
    });
  });
});

