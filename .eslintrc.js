module.exports = {
	env: {
		browser: false,
		commonjs: true,
		es2021: true,
	},
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 12,
	},
	plugins: ['@typescript-eslint'],
	rules: {
		'no-explicit-any': 0,
		'no-undef': 1,
	},
	globals: {
		console: true,
	},
};
