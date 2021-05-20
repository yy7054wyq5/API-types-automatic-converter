// @flow
import * as fs from 'fs';

// node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules

const filePath = './convert-result';
const configPath = './convert-config.js';

function init() {
	const configContent = `module.exports = {
		proxyApiUrl: '',
		differ: ,
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

	fs.readdir(filePath, (err, files) => {
		if (err) {
			fs.writeFile(configPath, configContent, () => {});
			fs.mkdir(filePath, () => {
				fs.mkdir(`${filePath}/api-types`, () => {});
				fs.mkdir(`${filePath}/api-json`, () => {});
			});
		}
	});
}

init();

export { filePath, init, configPath };
