import { expect } from 'chai';
import sinon from 'sinon';
import * as encryptionService from '../../src/services/encryption.service.js';

describe('Encryption Service', () => {
	let secret, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		// AES-256-GCM requires exactly 32 bytes
		secret = '01234567890123456789012345678901'; // 32 bytes
	});

	afterEach(() => sandbox.restore());

	it('should encrypt and decrypt data successfully', async () => {
		const plaintext = 'test-data';
		const encrypted = await encryptionService.encryptData(plaintext, secret);
		const decrypted = await encryptionService.decryptData(encrypted, secret);

		expect(encrypted).to.be.a('string');
		expect(decrypted).to.equal(plaintext);
	});
});
