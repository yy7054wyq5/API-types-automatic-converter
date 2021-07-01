import * as fs from 'fs';

// TODO: 接受 ts 配置文件
const ConfigPath = './api-convert-config.js';
const DefaultApiUrl = 'https://jsonplaceholder.typicode.com';

import { differ } from './differ';
import * as childProcess from 'child_process';
import type { Options } from 'http-proxy-middleware';

export type UpdateStrategy = 'cover' | 'append';

const defaultConfig = {
	proxy: {
		target: DefaultApiUrl,
		pathRewrite: {
			'^/api': '',
		},
		changeOrigin: true,
		secure: false,
	} as Options,
	differ, // for update
	updateStrategy: 'cover' as UpdateStrategy, // 'cover' | 'append'
	port: 5800,
	filePath: {
		json: './sample/assets/api-json',
		types: './sample/src/api-types',
	},
	ignore: {
		urls: [] as string[],
		methods: ['delete', 'options'] as string[],
		reqContentTypes: [] as string[],
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
