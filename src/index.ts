#!/usr/bin/env node

import * as nodeModule from 'module';
import * as fs from 'fs';
import * as vm from 'vm';
import * as express from 'express';
import { program } from 'commander';
import { StatusCodes } from 'http-status-codes';
import * as modifyResponse from 'node-http-proxy-json';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { init, ConfigPath } from './init';
import type { UpdateStrategy } from './init';
import { saveJSON, saveType } from './save';
import { json2Interface, ts2jsonschema } from './converter';
import { log, LogColors, logSuccess, logError } from './log';
import { firstUpperCase, line2Hump, getQueryParamsFromUrl, getFileContent, mkdirs } from './utils';
import { ApiTypeFileNameSuffix } from './suffix-of-file-name.config';
import { differ } from './differ';
const insideDiffer = differ;
import type { DifferParams, Differ } from './differ';

interface Req {
	url: string;
	method: string;
	headers: { ['content-type']: string };
}

type Tag = 'request' | 'response';

const Latest = 'Latest';

interface Config {
	port: number;
	proxy: { target: string };
	updateStrategy: UpdateStrategy;
	differ: null | ((params: DifferParams) => boolean);
	filePath: {
		json: string;
		types: string;
	};
	ignore: {
		urls: Array<string>;
		methods: Array<string>;
		reqContentTypes: Array<string>;
		resContentTypes: Array<string>;
	};
}

function readConfig(): Config {
	const content = fs.readFileSync(ConfigPath);
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
	return getModuleFromFile(content.toString(), 'api-convert-config.js').exports as Config;
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

function apiLog(data: Req, tag: Tag) {
	console.log(' ');
	if (tag === 'request') {
		console.log('-'.repeat(90));
	}
	log(tag, LogColors.yellow);
	console.log('url:', data.url);
	console.log('method:', data.method);
	console.log('content-type:', data.headers['content-type'] || '');
}

function ignoreProxy(req: Req, ignoreUrls: string[], ignoreMethods: string[]): boolean {
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

function creatTmpTSFile(filePath: string, content: string): string {
	const newContentFilePath = filePath.split('.ts')[0] + '.tmp' + '.ts';
	if (content) {
		fs.writeFileSync(newContentFilePath, content);
	}
	return newContentFilePath;
}

function resBodyIsValid(body): boolean {
	return !body || typeof body !== 'object' || (typeof body === 'object' && !Object.keys(body).length);
}

function reqParamsTypeContent(options: {
	_differ: Differ;
	data: unknown;
	typeName: string;
	typeFilePath: string;
	updateStrategy: UpdateStrategy;
}): string | null {
	const { typeFilePath, data, typeName, _differ, updateStrategy } = options;
	const { type: oldTypeContent } = getFileContent(typeFilePath);

	if (oldTypeContent && oldTypeContent.indexOf(Latest) > -1) {
		log('latest: ' + typeFilePath, LogColors.cyanBG);
		return null;
	}

	const typeContent = json2Interface(data, typeName);
	const canUpdate =
		(data && !oldTypeContent) ||
		_differ({
			data,
			oldData: null,
			typeContent,
			oldTypeContent,
		});
	if (!canUpdate) {
		log(`${typeFilePath} not update`, LogColors.blue);
		return null;
	}
	let updateContent = typeContent;
	if (updateStrategy === 'append' && oldTypeContent && oldTypeContent.indexOf(Latest) === -1) {
		updateContent = `${oldTypeContent || ''} ${json2Interface(data, typeName + Latest)}`;
		log('update: ' + typeFilePath, LogColors.cyanBG);
	}
	return updateContent;
}

function resBodyTypeContent(options: {
	_differ: Differ;
	body: unknown;
	typeName: string;
	typeFilePath: string;
	jsonFilePath: string;
	schemaFilePath: string;
	updateStrategy: UpdateStrategy;
}): null | { updateContent: string; tmpTSFilePath: string } {
	const { typeFilePath, jsonFilePath, schemaFilePath, body, typeName, _differ, updateStrategy } = options;
	const { json, schema, type: oldTypeContent } = getFileContent(typeFilePath, jsonFilePath, schemaFilePath);

	if (oldTypeContent && oldTypeContent.indexOf(Latest) > -1) {
		log('latest: ' + typeFilePath, LogColors.cyanBG);
		return null;
	}

	const typeContent = json2Interface(body, typeName);
	const canUpdate =
		(body && !oldTypeContent) ||
		_differ({
			data: body,
			oldData: json,
			typeContent,
			oldTypeContent,
			schema,
		});
	if (!canUpdate) {
		log(`${typeFilePath} not update`, LogColors.blue);
		return null;
	}
	let updateContent = typeContent;
	let tmpTSFilePath = '';
	if (updateStrategy === 'append' && oldTypeContent && oldTypeContent.indexOf(Latest) === -1) {
		updateContent = `${oldTypeContent || ''} ${json2Interface(body, typeName + Latest)}`;
		tmpTSFilePath = creatTmpTSFile(typeFilePath, typeContent);
		log('update: ' + typeFilePath, LogColors.cyanBG);
	}

	return {
		updateContent,
		tmpTSFilePath,
	};
}

program
	.command('init')
	.description('初始化配置')
	.action(() => init());

program
	.command('start')
	.description('转换服务启动')
	.action(() => {
		const { proxy, differ, ignore, port, filePath, updateStrategy } = readConfig();
		const _differ = differ || insideDiffer;

		if (!proxy.target) {
			logError('请配置接口的url');
			return;
		}

		const { methods: ignoreMethods, urls: ignoreUrls, reqContentTypes: ignoreReqContentTypes, resContentTypes: ignoreResContentTypes } = ignore;
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
		const onProxyReq = (proxyReq, req: Req, res) => {
			const { url, method } = req;
			const { typeFileSavePathHead, interfacePrefixName } = step(req, typeFileSavePath);
			const typeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.reqparams.interface}`;
			const contentType = req.headers['content-type'];
			const typeName = `${interfacePrefixName}ReqparamsI`;

			if (ignoreReqContentTypes.includes(contentType)) {
				return;
			}

			if (ignoreProxy(req, ignoreUrls, ignoreMethods)) {
				return;
			}

			const doSaveReqParams = (data) => {
				triggerSaveReqParams = () => {
					apiLog(req, 'request');

					const content = reqParamsTypeContent({
						data,
						typeName,
						typeFilePath,
						_differ,
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
			import('body/any').then((parsingBody) => {
				parsingBody(req, res, function (err, body) {
					if (err) {
						logError('发生错误');
						logError(err);
						return;
					}
					doSaveReqParams(body);
				});
			});
		};

		/**
		 * 代理响应
		 */
		const onProxyRes = (proxyRes, req, res) => {
			const responseContentType = proxyRes.headers['content-type'];
			if (ignoreResContentTypes.includes(responseContentType)) {
				return;
			}

			if (ignoreProxy(req, ignoreUrls, ignoreMethods)) {
				return;
			}

			modifyResponse(res, proxyRes, function (body) {
				// modify some information
				// body.age = 2;
				// delete body.version;

				const { url, method } = req;
				if (!url || !method) {
					logError('url或method无效');
					return body;
				}

				const { fileName, typeFileSavePathHead, interfacePrefixName } = step(req, typeFileSavePath);
				const typeName = interfacePrefixName + 'ResbodyI';
				const jsonFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.json}`;
				const typeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.resbody.interface}`;
				const schemaFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`;

				// mock
				if (req.headers['mock-response']) {
					logSuccess('代理响应：返回mock数据');
					res.statusCode = StatusCodes.OK;
					try {
						return JSON.parse(fs.readFileSync(jsonFilePath).toString());
					} catch (error) {
						console.log();
					}
					return body;
				}

				if (resBodyIsValid(body)) {
					logError('请禁用浏览器缓存或检查该请求的响应body是否是对象格式，cli无法捕获正常的响应体');
					return body;
				}

				// 将参数的保存置于此处，是为了保证日志按序输出
				return triggerSaveReqParams().then(() => {
					apiLog({ url, method, headers: proxyRes.headers }, 'response');

					const res = resBodyTypeContent({
						body,
						typeFilePath,
						typeName,
						schemaFilePath,
						jsonFilePath,
						_differ,
						updateStrategy,
					});

					if (!res) {
						return body;
					}

					const { updateContent, tmpTSFilePath } = res;

					saveType({
						filePath: typeFilePath,
						content: updateContent,
					}).then(() => {
						// 保存data
						saveJSON(jsonFilePath, JSON.stringify(body)).then(() => {
							console.log();
						});
						// 将interface转jsonschema
						const schemaContent = ts2jsonschema({
							fileName,
							filePath: tmpTSFilePath || typeFilePath,
							tsTypeName: typeName,
						});
						saveJSON(schemaFilePath, schemaContent).then(() => {
							fs.unlinkSync(tmpTSFilePath);
						});
					});

					return body; // return value can be a promise
				});
			});
		};

		const PROXY_CONFIG = {
			...proxy,
			onProxyReq,
			onProxyRes,
		};

		const app = express();
		const apiProxy = createProxyMiddleware(PROXY_CONFIG);
		app.use(function (req, res, next) {
			next();
		});
		app.use(apiProxy);
		app.listen(port);
	});

program.parse();
