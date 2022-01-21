#!/usr/bin/env node

import * as nodeModule from 'module';
import * as fs from 'fs';
import * as vm from 'vm';
import * as http from 'http';
import * as express from 'express';
import { program } from 'commander';
import { StatusCodes } from 'http-status-codes';
import modifyResponse = require('node-http-proxy-json');
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { init, ConfigPath, APIConverterConfig } from './init';
import { saveJSON, saveType } from './save';
import { ts2jsonschema } from './converter';
import { log, LogColors, logSuccess, logError } from './log';
import { firstUpperCase, line2Hump, getQueryParamsFromUrl, mkdirs } from './utils';
import { ApiTypeFileNameSuffix } from './suffix-of-file-name.config';
import { differ } from './differ';
const insideDiffer = differ;
import { getReqParamsTypeContent, getResBodyTypeContent } from './API-content';
import anyBody = require('body/any');
import * as childProcess from 'child_process';

type Tag = 'request' | 'response' | 'mock';

const getModuleFromFile = (bundle: string, filename: string) => {
	const m = { exports: {} };
	const wrapper = nodeModule.wrap(bundle);
	const script = new vm.Script(wrapper, {
		filename,
		displayErrors: true,
	});
	const result = script.runInThisContext(); // 此处可以指定代码的执行环境，此api在nodejs文档中有介绍
	result.call(m.exports, m.exports, require, m); // 执行wrapper函数，此处传入require就解决了第一种方法不能require的问题
	return m;
};

function customConfigFilePath(path: string): { path: string; folder: string } {
	const lastPointIndex = path.lastIndexOf('.');
	const lastSlashIndex = path.lastIndexOf('/');
	const tmpPath = path.slice(0, lastPointIndex);
	const tmpFolder = path.slice(0, lastSlashIndex);
	return {
		path: tmpPath,
		folder: tmpFolder,
	};
}

function readConfig(path?: string): APIConverterConfig & { ts: boolean; jsConfigFilePath: string; configFileFolder: string } {
	const extensionNames = ['.ts', '.js'];
	let content: Buffer | null = null;
	let isTSFile = false;

	// 没指定配置文件路径，读取默认路径的配置
	if (!path) {
		for (const name of extensionNames) {
			try {
				path = ConfigPath + name;
				content = fs.readFileSync(path);
			} catch (error) {
				path = '';
				content = null;
			}
			if (path && content) break;
		}
	}

	// console.log(path);
	const jsConfigFilePath = (path ? customConfigFilePath(path).path : ConfigPath) + '.js';
	// console.log(jsConfigFilePath);

	if (path.includes('.ts')) {
		isTSFile = true;
		try {
			// 强制转换不管报错的原因如下：
			// 1. 目前的错误就是是找不到类型定义，没关系; 只要转出js即可
			// 2. 项目的tsconfig.json和本身的tsconfig.json可能会不一样，也有可能报错
			// 3. 放弃使用ts-node，也是为了不让使用者去多下载一个包
			childProcess.execSync(`tsc ${path}`);
			content = fs.readFileSync(jsConfigFilePath);
		} catch (error) {
			content = fs.readFileSync(jsConfigFilePath);
		}
		// console.log(content.toString());
	}
	// console.log(path);
	// console.log(content.toString());
	const config = getModuleFromFile(content.toString(), jsConfigFilePath).exports as APIConverterConfig;
	return { ...config, ts: isTSFile, jsConfigFilePath, configFileFolder: customConfigFilePath(path).folder };
}

function step(
	req: { method: string; url: string },
	typeFileSavePath: string
): {
	fileName: string;
	interfacePrefixName: string;
	typeFileSavePathHead: string;
} {
	let { method } = req;
	const url = req.url;
	method = method.toLowerCase(); // 方法名转小写
	let api = url;
	const urlParamsIndex = api.indexOf('?');
	if (urlParamsIndex > 0) {
		api = api.split('?')[0];
	}
	// 过滤掉api上的非小写字母和短横线的部分
	const apiArr = api.split('/').filter((word) => /^[a-z-]+$/g.test(word));
	api = apiArr.join('-'); // 斜杠改为短横线
	const fileName = `${method}.${api}`; // 拼接文件名
	const typeFileSavePathHead = `${typeFileSavePath}/${fileName}`;
	const interfacePrefixName = firstUpperCase(method) + line2Hump('-' + api);
	return {
		fileName,
		interfacePrefixName,
		typeFileSavePathHead,
	};
}

function apiLog(data: express.Request | http.IncomingMessage, tag: Tag) {
	console.log(' ');
	if (tag !== 'response') {
		console.log('-'.repeat(90));
	}
	log(tag, LogColors.yellow);
	console.log('url:', data.url);
	console.log('method:', data.method);
	console.log('content-type:', data.headers['content-type'] || '');
}

function ignoreReqProxy(req: express.Request, ignoreUrls: string[], ignoreMethods: string[]): boolean {
	const { url, method } = req;
	for (const ignoreUrl of ignoreUrls) {
		if (url.indexOf(ignoreUrl) > -1) {
			return true;
		}
	}
	if (ignoreMethods.map((i) => i.toLowerCase()).includes(method.toLowerCase())) {
		return true;
	}
	return false;
}

function ignoreResProxy(res: http.IncomingMessage): boolean {
	const errorCodes = [StatusCodes.NOT_FOUND, StatusCodes.BAD_GATEWAY, StatusCodes.GATEWAY_TIMEOUT, StatusCodes.INTERNAL_SERVER_ERROR];
	if (errorCodes.includes(res.statusCode)) {
		return true;
	}
	return false;
}

function validateDataBeforeConvert(body: unknown): boolean {
	if (!body) {
		return false;
	}
	if (typeof body !== 'object') {
		return false;
	}
	if (typeof body === 'object' && !Object.keys(body).length) {
		return false;
	}
	return true;
}

program
	.command('init')
	.arguments('[configFileExtensionName]')
	.description('初始化配置')
	.action((configFileExtensionName) => init(configFileExtensionName));

program
	.command('start')
	.arguments('[configPath]')
	.description('转换服务启动')
	.action((configPath) => {
		const { proxy, differ, ignore, port, filePath, updateStrategy, ts, jsConfigFilePath } = readConfig(configPath);
		// 是ts的配置文件，则删除被转换出来的js文件
		if (ts) {
			fs.unlinkSync(jsConfigFilePath);
		}
		const _differ = differ || insideDiffer;

		if (!proxy.target) {
			logError('请配置接口的url');
			return;
		}

		const {
			methods: ignoreMethods,
			urls: ignoreUrls,
			reqContentTypes: ignoreReqContentTypes,
			resContentTypes: ignoreResContentTypes,
		} = ignore;
		const { typeFileSavePath, jsonFileSavePath } = mkdirs(filePath.types, filePath.json);

		if (!typeFileSavePath || !jsonFileSavePath) {
			logError('请配置有效的文件存放路径');
			return;
		}

		/**
		 * 记录保存请求参数的函数，放到diff完后执行
		 */
		let triggerSaveReqParams: () => Promise<void> = () => {
			return Promise.resolve();
		};

		/**
		 * 代理请求
		 */
		const onProxyReq = (proxyReq: http.ClientRequest, req: express.Request) => {
			const { url, method } = req;
			const { typeFileSavePathHead, interfacePrefixName } = step(req, typeFileSavePath);
			const typeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.reqparams.interface}`;
			const contentType = req.headers['content-type'];
			const typeName = `${interfacePrefixName}ReqparamsI`;

			if (ignoreReqContentTypes.includes(contentType)) {
				return;
			}

			if (ignoreReqProxy(req, ignoreUrls, ignoreMethods)) {
				return;
			}

			const doSaveReqParams = (data: unknown) => {
				triggerSaveReqParams = () => {
					apiLog(req, 'request');
					if (!validateDataBeforeConvert(data)) {
						log('请求参数或请求体无效', LogColors.blue);
						return Promise.resolve();
					}

					const content = getReqParamsTypeContent({
						data,
						typeName,
						typeFilePath,
						differ: _differ,
						updateStrategy,
					});

					if (content) {
						return saveType({
							filePath: typeFilePath,
							content,
						});
					}

					return Promise.resolve();
				};
			};

			if (method === 'GET') {
				const params = getQueryParamsFromUrl(url);
				doSaveReqParams(params);
				return;
			}
			anyBody(req, function (err: unknown, body: unknown) {
				if (err) {
					logError('解析请求体发生错误');
					logError(err);
					return;
				}
				doSaveReqParams(body);
			});
		};

		/**
		 * 代理响应
		 */
		const onProxyRes = (proxyRes: http.IncomingMessage, req: express.Request, res: express.Response) => {
			const responseContentType = proxyRes.headers['content-type'];
			if (ignoreResContentTypes.includes(responseContentType)) {
				return;
			}

			const { url, method } = req;
			if (!url || !method) {
				logError('url或method无效');
				return;
			}

			if (ignoreResProxy(proxyRes)) {
				return;
			}

			modifyResponse(res, proxyRes, function (body: unknown) {
				// modify some information
				// body.age = 2;
				// delete body.version;

				const { fileName, typeFileSavePathHead, interfacePrefixName } = step(req, typeFileSavePath);
				const typeName = interfacePrefixName + 'ResbodyI';
				const jsonFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.json}`;
				const typeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.resbody.interface}`;
				const schemaFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`;

				// mock
				const reqHeaders = Object.keys(req.headers).join(',');
				if (reqHeaders.indexOf('mock-response') > -1) {
					apiLog(req, 'mock');
					logSuccess('返回mock数据');
					res.statusCode = StatusCodes.OK;
					try {
						const mockStr = fs.readFileSync(jsonFilePath).toString();
						const mockData = JSON.parse(mockStr);
						console.log(mockStr);
						return mockData;
					} catch (error) {
						console.log();
					}
					return body;
				}

				// 将参数的保存置于此处，是为了保证日志按序输出
				return triggerSaveReqParams().then(() => {
					apiLog(proxyRes, 'response');
					if (!validateDataBeforeConvert(body)) {
						log('请求响应体无效或该请求已被缓存', LogColors.blue);
						try {
							console.log(JSON.stringify(body));
						} catch (error) {
							// nothing
						}
						return body;
					}
					const result = getResBodyTypeContent({
						body,
						typeFilePath,
						typeName,
						schemaFilePath,
						jsonFilePath,
						differ: _differ,
						updateStrategy,
					});

					if (!result) {
						return body;
					}

					const { updateContent, latestTypeContentFilePath } = result;

					saveType({
						filePath: typeFilePath,
						content: updateContent,
					}).then(() => {
						// 保存data
						saveJSON(jsonFilePath, JSON.stringify(body));
						const schemaContent = ts2jsonschema({
							fileName,
							filePath: latestTypeContentFilePath || typeFilePath,
							tsTypeName: typeName,
						});
						// 将interface转jsonschema
						saveJSON(schemaFilePath, schemaContent).then(() => {
							if (latestTypeContentFilePath) {
								fs.unlinkSync(latestTypeContentFilePath);
							}
						});
					});

					return body; // return value can be a promise
				});
			});
		};

		const PROXY_CONFIG: Options = {
			...proxy,
			onProxyReq,
			onProxyRes,
		};

		const app: express.Application = express();
		app.on('error', (error) => {
			console.log(error);
		});
		const apiProxy = createProxyMiddleware(PROXY_CONFIG);

		app.use(function (req, res, next) {
			next();
		});
		app.use(apiProxy);
		app.listen(port);
	});

// eslint-disable-next-line no-undef
program.parse(process.argv);
