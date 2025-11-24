module.exports = {
	root: true,
	env: {
		browser: false,
		es2021: true,
		node: true,
		worker: true
	},
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module'
	},
	plugins: ['prettier'],
	rules: {
		'no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_'
			}
		],
		'no-console': 'off',
		'prettier/prettier': 'error'
	},
	ignorePatterns: [
		'node_modules/',
		'dist/',
		'.wrangler/',
		'build/',
		'*.config.js',
		'*.config.cjs',
		'migrations/',
		'**/*.spec.js'
	]
};

