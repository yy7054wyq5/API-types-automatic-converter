// @flow

const fs = require('fs');

// node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules

const ConfigPath = './convert-config.js';
const DefaultApiUrl = 'https://jsonplaceholder.typicode.com';

function init() {
	const configContent = `const Ajv = require('ajv');
	function differ(current, old, oldTypes, oldSchema) {
		// console.log('current', current, typeof current);
		// console.log('old', old);
		// console.log('oldTypes', oldTypes);
		// console.log('oldSchema', oldSchema);
		const ajv = new Ajv();
		if (oldSchema && current) {
			const validate = ajv.compile(oldSchema);
			const valid = validate(current);
			if (valid) {
				return false;
			}
		}
	
		return true;
	}
	
	module.exports = {
		/** 就是 http-proxy-middleware 的配置*/
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
			jsonSchema: false,
			json: false,
		},
		filePath: {
			json: './sample/assets/api-json',
			types: './sample/src/api-types',
		},
		ignore: {
			methods: ['delete'],
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
