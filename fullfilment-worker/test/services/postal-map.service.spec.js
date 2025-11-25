import { expect } from 'chai';
import sinon from 'sinon';
import * as postalMapService from '../../src/services/postal-map.service.js';

describe('Postal Map Service', () => {
	let db, sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		db = {
			prepare: sandbox.stub(),
		};
	});

	afterEach(() => sandbox.restore());

	describe('getAllPostalMappings', () => {
		it('should return all postal mappings', async () => {
			const mockMappings = [
				{ start_postal_code: '100001', end_postal_code: '100099', warehouses: '["wh_001"]' },
			];
			db.prepare.returns({
				all: sandbox.stub().resolves({ results: mockMappings }),
			});

			const result = await postalMapService.getAllPostalMappings(db);

			expect(db.prepare.called).to.be.true;
			expect(result).to.deep.equal(mockMappings);
		});
	});
});

