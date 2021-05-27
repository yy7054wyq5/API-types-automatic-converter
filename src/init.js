// @flow

const fs = require('fs');

// node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules

const ConverResultPath = './convert-result';
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
		ignore: {
			methods: ['delete'],
			reqContentTypes : [],
			resContentTypes : ['application/octet-stream'],
		}
	}`;

	fs.readdir(ConverResultPath, (err, files) => {
		if (err) {
			fs.writeFile(ConfigPath, configContent, () => {});
			fs.mkdir(ConverResultPath, () => {
				fs.mkdir(`${ConverResultPath}/api-types`, () => {});
				fs.mkdir(`${ConverResultPath}/api-json`, () => {});
			});
		}
	});
}

init();

module.exports = {
	init,
	DefaultApiUrl,
	ConverResultPath,
	ConfigPath,
};
