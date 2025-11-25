import { expect } from 'chai';
import sinon from 'sinon';
import * as cookieService from '../../src/services/cookie.service.js';

describe('Cookie Service', () => {
	let c, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		c = {
			header: sandbox.stub().returnsThis(),
		};
	});

	afterEach(() => sandbox.restore());

	it('should set refresh token cookie', () => {
		cookieService.setRefreshTokenCookie(c, 'test-token');

		expect(c.header.calledWith('Set-Cookie', sinon.match.string, { append: true })).to.be.true;
	});
});
