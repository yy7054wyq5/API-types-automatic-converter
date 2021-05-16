module.exports = {
	env: {
		es6: true,
		node: true,
	},
	extends: ['plugin:flowtype/recommended'],
	plugins: ['flowtype'],
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly',
	},
	parserOptions: {
		ecmaVersion: 11,
		sourceType: 'module',
	},
	rules: {
		'indent': ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		'quotes': ['error', 'single'],
		'semi': ['error', 'always'],
	},
};
