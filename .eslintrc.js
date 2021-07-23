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
		'@typescript-eslint/no-explicit-any': 2,
		'no-undef': 2,
	},
	globals: {
		console: true,
		Buffer: true,
		__dirname: true,
	},
};
