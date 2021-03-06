/* global describe, expect, fallback, it */

describe('tests.unit.core.normalizeString', function() {
	it('should be a Function', function() {
		var test = fallback.normalizeString;
		expect(test).to.be.a('function');
	});

	var tests = [
		[],
		false,
		true,
		function() {},
		0,
		{},
		undefined
	];

	it('should return the input when sent an String', function() {
		var test = 'test1';
		var result = fallback.normalizeString(test);
		expect(result).to.equal(test);
	});

	it('should return the input when sent an String with a fallback', function() {
		var test = 'test2';
		var result = fallback.normalizeString(test, 'fallback');
		expect(result).to.equal(test);
	});

	fallback.each(tests, function(test) {
		it('should return null when sent ' + typeof test + ' with no fallback', function() {
			var result = fallback.normalizeString(test);
			expect(result).to.equal(null);
		});

		it('should return the fallback when sent ' + typeof test + ' with a fallback', function() {
			var result = fallback.normalizeString(test, 'fallback');
			expect(result).to.equal('fallback');
		});
	});
});
