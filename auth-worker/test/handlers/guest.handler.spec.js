import { expect } from 'chai';
import sinon from 'sinon';
import { initGuestSession } from '../../src/handlers/guest.handler.js';

describe('Guest Handler', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			req: {
				json: sandbox.stub(),
			},
			env: {
				DB: {
					prepare: sandbox.stub(),
				},
			},
			json: sandbox.stub().returnsThis(),
			header: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	it('should create guest session successfully', async () => {
		c.req.json.resolves({
			name: 'Guest User',
			email: 'guest@example.com',
			phone: '1234567890',
		});

		c.env.DB.prepare.returns({
			bind: sandbox.stub().returns({
				run: sandbox.stub().resolves(),
			}),
		});

		await initGuestSession(c);

		expect(c.req.json.calledOnce).to.be.true;
		expect(c.json.calledOnce).to.be.true;
	});
});
