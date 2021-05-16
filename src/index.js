// @flow
const express = require('express');
const parsingBody = require('body/any');
const proxy = require('http-proxy-middleware');
const modifyResponse = require('node-http-proxy-json');
const child_process = require('child_process');
const fs = require('fs');
const { StatusCodes } = require('http-status-codes');

const { log, LogColors, logSuccess, logError } = require('./log');
const { firstUpperCase, line2Hump, getQueryParamsFromUrl } = require('./utils');
const { json2Interface } = require('./json-2-interface');
const { saveJSON } = require('./save-json');
const { saveType } = require('./save-type');
const { ts2jsonschema } = require('./ts-2-jsonschema');

const typeFileSavePath = './src/app/api-types';
const jsonFileSavePath = './src/assets/api-json';
const proxyApiUrl = 'https://beiming.test.haochang.tv/api';
const ApiTypeFileNameSuffix = {
	resbody: {
		json: 'resbody.json',
		interface: 'resbody.interface.ts',
		jsonschema: 'resbody.jsonschema.json',
	},
	reqparams: {
		interface: 'reqparams.interface.ts',
	},
};

function step(req): {
	fileName: string,
	interfacePrefixName: string,
	typeFileSavePathHead: string,
} {
	let { url, method } = req;
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

function saveReqParams(params: Object, typeFileSavePathHead: string, interfacePrefixName: string) {
	// 保存res params interface
	if (params && Object.keys(params).length) {
		const reqparamsTypeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.reqparams.interface}`;
		const reqparamsTypeName = interfacePrefixName + 'ReqparamsI';
		saveType({
			filePath: reqparamsTypeFilePath,
			name: reqparamsTypeName,
			sourceStr: json2Interface(params, reqparamsTypeName),
		});
	}
}

const PROXY_CONFIG = {
	target: proxyApiUrl,
	pathRewrite: {
		'^/api': '',
	},
	changeOrigin: true,
	secure: false,
	onProxyReq: (proxyReq, req, res) => {
		logSuccess('api-types-creater-serve.js onProxyReq');
		let { url, method } = req;
		const { typeFileSavePathHead, interfacePrefixName } = step(req);
		if (method === 'GET') {
			const params = getQueryParamsFromUrl(url);
			saveReqParams(params, typeFileSavePathHead, interfacePrefixName);
			return;
		}

		// 忽略
		const contentType = req.headers['content-type'];
		if (contentType && contentType.indexOf('multipart/form-data') > -1) {
			logSuccess('onProxyReq handle req body ignore multipart/form-data');
			return;
		}

		parsingBody(req, res, function (err, body) {
			if (err) {
				logError('onProxyReq handle req body err');
				logError(err);
				return;
			}
			saveReqParams(body, typeFileSavePathHead, interfacePrefixName);
		});
	},
	onProxyRes: (proxyRes, req, res) => {
		// modify some information
		// body.age = 2;
		// delete body.version;

		logSuccess('api-types-creater-serve.js onProxyRes');
		console.log('req.url', req.url);
		console.log('req.method', req.method);
		console.log('req.originalUrl', req.originalUrl);
		console.log('req.params', req.params);

		if (req.url.indexOf('.xlsx') > -1) {
			return;
		}

		modifyResponse(res, proxyRes, function (body) {
			let { url, method } = req;

			if (!url || !method) {
				logError(`${url}: 接口返回无效`);
				return body;
			}

			const { fileName, typeFileSavePathHead, interfacePrefixName } = step(req);
			const resbodyJsonFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.json}`;

			// 保存res body interface
			if (body && Object.keys(body).length) {
				const resbodyTypeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.resbody.interface}`;
				const resbodyTypeName = interfacePrefixName + 'ResbodyI';
				saveType({
					filePath: resbodyTypeFilePath,
					name: resbodyTypeName,
					sourceStr: json2Interface(body, resbodyTypeName),
				}).then(() => {
					// 保存data
					saveJSON(resbodyJsonFilePath, JSON.stringify(body));
					// 将interface转jsonschema
					ts2jsonschema({
						fileName,
						filePath: resbodyTypeFilePath,
						tsTypeName: resbodyTypeName,
						jsonschemaFilePath: `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`,
					});
				});
			}

			// mock
			if (req.headers['mock-response']) {
				res.statusCode = StatusCodes.OK;
				try {
					return JSON.parse(fs.readFileSync(resbodyJsonFilePath).toString());
				} catch (error) {
					console.log(error);
					return body;
				}
			}

			return body; // return value can be a promise
		});
	},
};

const app = express();
const apiProxy = proxy(PROXY_CONFIG);
app.use(function (req, res, next) {
	// console.log('\n\nHeaders');
	// console.log(req.headers);

	// console.log('\nQuery');
	// console.log(req.query);

	// console.log('\nBody');
	// console.log(req.body);
	next();
});

app.use(apiProxy);
app.listen(5400);
