import { expect } from 'chai';
import sinon from 'sinon';
import {
	registerHandler,
	loginHandler,
	refreshHandler,
	logoutHandler,
	meHandler,
	updateProfileHandler,
	addAddressHandler,
	updateAddressHandler,
	deleteAddressHandler,
} from '../../src/handlers/auth.handler.js';

describe('Auth Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
				param: sandbox.stub(),
				query: sandbox.stub(),
				header: sandbox.stub(),
			},
			get: sandbox.stub(),
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
				JWT_SECRET: 'test-secret',
				AUTH_ENC_KEY: '01234567890123456789012345678901',
				LOGS: {
					put: sandbox.stub().resolves(),
				},
			},
			json: sandbox.stub().returnsThis(),
			header: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	it('should handle user registration request', async () => {
		c.req.json.resolves({
			email: 'test@example.com',
			password: 'password123',
			first_name: 'Test',
			last_name: 'User',
		});

		await registerHandler(c);

		expect(c.req.json.calledOnce).to.be.true;
	});

	it('should handle user login request', async () => {
		c.req.json.resolves({
			email: 'test@example.com',
			password: 'password123',
		});

		await loginHandler(c);

		expect(c.req.json.calledOnce).to.be.true;
	});

	it('should handle refresh token request', async () => {
		c.req.header.returns('refresh_token=test-token');
		await refreshHandler(c);

		expect(c.req.header.called).to.be.true;
	});

	it('should handle logout request', async () => {
		c.req.header.returns('refresh_token=test-token');
		await logoutHandler(c);

		expect(c.json.calledOnce).to.be.true;
	});

	it('should handle get current user request', async () => {
		c.get.withArgs('auth').returns({ user_id: 'user123' });
		c.req.query.returns({});
		c.env.DB.prepare.returns({
			bind: sandbox.stub().returns({
				first: sandbox.stub().resolves({
					user_id: 'user123',
					first_name: 'Test',
					last_name: 'User',
				}),
			}),
		});

		await meHandler(c);

		expect(c.get.calledWith('auth')).to.be.true;
	});

	it('should handle update profile request', async () => {
		c.get.withArgs('auth').returns({ user_id: 'user123' });
		c.req.json.resolves({ first_name: 'Updated' });
		c.env.DB.prepare.returns({
			bind: sandbox.stub().returns({
				run: sandbox.stub().resolves(),
			}),
		});

		await updateProfileHandler(c);

		expect(c.req.json.calledOnce).to.be.true;
	});

	it('should handle add address request', async () => {
		c.get.withArgs('auth').returns({ user_id: 'user123' });
		c.req.json.resolves({ street: '123 Main St' });
		c.env.DB.prepare.returns({
			bind: sandbox.stub().returns({
				first: sandbox.stub().resolves({ addresses_cipher: null }),
				run: sandbox.stub().resolves(),
			}),
		});

		await addAddressHandler(c);

		expect(c.req.json.calledOnce).to.be.true;
	});

	it('should handle update address request', async () => {
		c.get.withArgs('auth').returns({ user_id: 'user123' });
		c.req.param.withArgs('id').returns('addr123');
		c.req.json.resolves({ street: 'Updated St' });
		c.env.DB.prepare.returns({
			bind: sandbox.stub().returns({
				first: sandbox.stub().resolves({
					addresses_cipher: null,
				}),
				run: sandbox.stub().resolves(),
			}),
		});

		await updateAddressHandler(c);

		expect(c.req.param.calledWith('id')).to.be.true;
	});

	it('should handle delete address request', async () => {
		c.get.withArgs('auth').returns({ user_id: 'user123' });
		c.req.param.withArgs('id').returns('addr123');
		c.env.DB.prepare.returns({
			bind: sandbox.stub().returns({
				first: sandbox.stub().resolves({ addresses_cipher: null }),
				run: sandbox.stub().resolves(),
			}),
		});

		await deleteAddressHandler(c);

		expect(c.req.param.calledWith('id')).to.be.true;
	});
});
