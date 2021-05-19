// @flow
import * as fs from 'fs';

// node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules

const filePath = './convert-result';

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
			fs.writeFile('./convert-config.js', configContent, () => {});
			fs.mkdir(filePath, () => {
				fs.mkdir(`${filePath}/api-types`, () => {});
				fs.mkdir(`${filePath}/api-json`, () => {});
			});
		}
	});
}

init();

export { filePath, init };
