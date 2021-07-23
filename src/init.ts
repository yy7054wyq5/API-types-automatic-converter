import * as fs from 'fs';

export const ConfigPath = './api-convert-config';
const DefaultApiUrl = 'https://jsonplaceholder.typicode.com';

import { differ, Differ } from './differ';
import * as childProcess from 'child_process';
import type { Options } from 'http-proxy-middleware';

export type UpdateStrategy = 'cover' | 'append';
export interface APIConverterConfig {
	proxy: Omit<Options, 'onProxyRes' | 'onProxyReq'>;
	differ: Differ;
	updateStrategy: UpdateStrategy;
	port: number;
	filePath: {
		json: string;
		types: string;
	};
	ignore: {
		urls: string[];
		methods: string[];
		reqContentTypes: string[];
		resContentTypes: string[];
	};
}

export const defaultConfig: APIConverterConfig = {
	differ, // for update
	proxy: {
		target: 'https://jsonplaceholder.typicode.com',
		pathRewrite: {
			'^/api': '',
		},
		changeOrigin: true,
		secure: false,
	},
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

function create_ts_config_content(configContent: string): string {
	const importContent = `
		import { DifferParams, APIConverterConfig } from 'api-types-automatic-converter';
	`;
	const copyTag = `// comments for copy, don't delete it`;
	const differ_ts_file_path = __dirname.replace('/dist', '/src/differ.ts');
	let differContent = fs.readFileSync(differ_ts_file_path).toString();
	differContent = differContent.split(copyTag)[1];
	return `${importContent} ${differContent} module.exports = ${configContent} as APIConverterConfig;`;
}

function init(fileExtensionName = 'ts'): void {
	let configContent = JSON.stringify(defaultConfig); // 该方法会把函数丢弃
	configContent = configContent.replace('{', '{ differ,'); // 把函数补上
	const _configFilePath = `${ConfigPath}.${fileExtensionName}`;
	// 根据想要的文件内容来反推怎么写代码
	const content = fileExtensionName === 'ts' ? create_ts_config_content(configContent) : `${differ.toString()}	module.exports = ${configContent};`;
	fs.writeFile(_configFilePath, content, () => {
		console.log('配置文件已生成');
	});
	childProcess.exec(`prettier --config ./.prettierrc.json --write ${_configFilePath}`);
}

// init();

export { init, DefaultApiUrl };
