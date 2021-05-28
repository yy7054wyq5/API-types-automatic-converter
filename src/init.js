// @flow

const fs = require('fs');

// node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules

const ConfigPath = './convert-config.js';
const DefaultApiUrl = 'http://yourAPIhost';

function init() {
	const configContent = `module.exports = {
		proxy: {
			target: '${DefaultApiUrl}',
			pathRewrite: {
				'^/api': '',
			},
			changeOrigin: true,
			secure: false,
		},
		differ: null, // for update
		port: 5400,
		enable: {
			jsonSchema: false,
			json: false
		},
		filePath: {
			json: '',
			types: ''
		},
		ignore: {
			methods: ['delete'],
			reqContentTypes : [],
			resContentTypes : ['application/octet-stream'],
		}
	}`;
	fs.writeFile(ConfigPath, configContent, () => {});
}

init();

module.exports = {
	init,
	DefaultApiUrl,
	ConfigPath,
};
