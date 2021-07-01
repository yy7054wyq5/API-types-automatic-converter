import * as fs from 'fs';

// TODO: 接受 ts 配置文件
const ConfigPath = './api-convert-config.js';
const DefaultApiUrl = 'https://jsonplaceholder.typicode.com';

import { differ } from './differ';
import * as childProcess from 'child_process';

export type UpdateStrategy = 'cover' | 'append';

const defaultConfig = {
	proxy: {
		target: DefaultApiUrl,
		pathRewrite: {
			'^/api': '',
		},
		changeOrigin: true,
		secure: false,
	},
	differ, // for update
	updateStrategy: 'cover', // 'cover' | 'append'
	port: 5800,
	filePath: {
		json: './sample/assets/api-json',
		types: './sample/src/api-types',
	},
	ignore: {
		urls: [],
		methods: ['delete', 'options'],
		reqContentTypes: [],
		resContentTypes: ['application/octet-stream'],
	},
};

function init(): void {
	let configContent = JSON.stringify(defaultConfig); // 该方法会把函数丢弃
	configContent = configContent.replace('{', '{ differ,'); // 把函数补上
	const content = `
		${differ.toString()}
		module.exports = ${configContent};
	`;
	fs.writeFile(ConfigPath, content, () => {
		console.log();
	});
	childProcess.exec(`prettier --config ./.prettierrc.json --write ${ConfigPath}`);
}

// init();

export { init, DefaultApiUrl, ConfigPath };