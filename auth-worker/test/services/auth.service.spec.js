import { expect } from 'chai';
import sinon from 'sinon';
import * as authService from '../../src/services/auth.service.js';
import * as userModel from '../../src/models/user.model.js';
import * as tokenModel from '../../src/models/refresh-token.model.js';
import * as tokenService from '../../src/services/token.service.js';
import * as cryptoUtil from '../../src/utils/crypto.util.js';
import * as encryptionService from '../../src/services/encryption.service.js';
import * as cookieService from '../../src/services/cookie.service.js';
import * as clientUtil from '../../src/utils/client.util.js';
import * as logService from '../../src/services/log.service.js';
import bcrypt from 'bcryptjs';

describe('Auth Service', () => {
  let c, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    c = {
      req: {
        json: sandbox.stub()
      },
      env: {
        DB: {},
        JWT_SECRET: 'test-secret',
        AUTH_ENC_KEY: 'test-enc-key'
      },
      json: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => sandbox.restore());

  describe('registerUser', () => {
    it('should register user successfully', async () => {
      c.req.json.resolves({
        email: 'test@test.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      });

      sandbox.stub(cryptoUtil, 'normalizeEmail').returns('test@test.com');
      sandbox.stub(cryptoUtil, 'sha256Hex').resolves('email-hash');
      sandbox.stub(userModel, 'findUserByEmailHash').resolves(null);
      sandbox.stub(userModel, 'insertUser').resolves();
      sandbox.stub(tokenService, 'generateAccessToken').resolves('access-token');
      sandbox.stub(tokenService, 'generateRefreshToken').returns('refresh-token');
      sandbox.stub(tokenService, 'hashRefreshToken').resolves('token-hash');
      sandbox.stub(tokenModel, 'storeRefreshToken').resolves();
      sandbox.stub(cookieService, 'setRefreshTokenCookie').returns();
      sandbox.stub(logService, 'logEvent').resolves();
      sandbox.stub(clientUtil, 'getClientInfo').returns({ ip: '127.0.0.1', ua: 'test' });
      sandbox.stub(encryptionService, 'encryptData').resolves('encrypted-data');

      const result = await authService.registerUser(c);

      expect(userModel.insertUser.calledOnce).to.be.true;
    });

    it('should return error for missing fields', async () => {
      c.req.json.resolves({ email: 'test@test.com' });

      const result = await authService.registerUser(c);

      expect(c.json.calledWith({ error: 'Missing required fields' }, 400)).to.be.true;
    });

    it('should return error if user exists', async () => {
      c.req.json.resolves({
        email: 'test@test.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      });

      sandbox.stub(cryptoUtil, 'normalizeEmail').returns('test@test.com');
      sandbox.stub(cryptoUtil, 'sha256Hex').resolves('email-hash');
      sandbox.stub(userModel, 'findUserByEmailHash').resolves({ user_id: '123' });

      const result = await authService.registerUser(c);

      expect(c.json.calledWith({ error: 'User already exists' }, 409)).to.be.true;
    });
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      c.req.json.resolves({ email: 'test@test.com', password: 'password123' });

      sandbox.stub(cryptoUtil, 'normalizeEmail').returns('test@test.com');
      sandbox.stub(cryptoUtil, 'sha256Hex').resolves('email-hash');
      sandbox.stub(userModel, 'findUserByEmailHash').resolves({
        user_id: '123',
        password_hash: 'hashed-password'
      });
      sandbox.stub(bcrypt, 'compare').resolves(true);
      sandbox.stub(userModel, 'updateUserLastLogin').resolves();
      sandbox.stub(tokenService, 'generateAccessToken').resolves('access-token');
      sandbox.stub(tokenService, 'generateRefreshToken').returns('refresh-token');
      sandbox.stub(tokenService, 'hashRefreshToken').resolves('token-hash');
      sandbox.stub(tokenModel, 'storeRefreshToken').resolves();
      sandbox.stub(cookieService, 'setRefreshTokenCookie').returns();
      sandbox.stub(logService, 'logEvent').resolves();
      sandbox.stub(clientUtil, 'getClientInfo').returns({ ip: '127.0.0.1', ua: 'test' });

      const result = await authService.loginUser(c);

      expect(userModel.findUserByEmailHash.calledOnce).to.be.true;
    });

    it('should return error for invalid credentials', async () => {
      c.req.json.resolves({ email: 'test@test.com', password: 'wrong' });

      sandbox.stub(cryptoUtil, 'normalizeEmail').returns('test@test.com');
      sandbox.stub(cryptoUtil, 'sha256Hex').resolves('email-hash');
      sandbox.stub(userModel, 'findUserByEmailHash').resolves(null);

      const result = await authService.loginUser(c);

      expect(c.json.calledWith({ error: 'Invalid credentials' }, 401)).to.be.true;
    });
  });
});

