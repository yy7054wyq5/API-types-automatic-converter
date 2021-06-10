// @flow

const fs = require('fs');

// node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules

const ConfigPath = './api-convert-config.js';
const DefaultApiUrl = 'https://jsonplaceholder.typicode.com';

function init() {
	const configContent = `const Ajv = require('ajv');
	function differ(data, oldData, type, oldType, oldSchema) {
		const ajv = new Ajv();
		if (oldSchema && data) {
			const validate = ajv.compile(oldSchema);
			const valid = validate(data);
			if (valid) {
				return false;
			}
		}
	
		return true;
	}
	
	module.exports = {
		proxy: {
			target: '${DefaultApiUrl}',
			pathRewrite: {
				'^/api': '',
			},
			changeOrigin: true,
			secure: false,
		},
		differ, // for update
		port: 5800,
		enable: {
			jsonSchema: true,
			json: true,
		},
		filePath: {
			json: './sample/assets/api-json',
			types: './sample/src/api-types',
		},
		ignore: {
			methods: ['delete','options'],
			reqContentTypes: [],
			resContentTypes: ['application/octet-stream'],
		},
	};
	`;
	fs.writeFile(ConfigPath, configContent, () => {});
}

module.exports = {
	init,
	DefaultApiUrl,
	ConfigPath,
};
