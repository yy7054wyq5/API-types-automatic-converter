// @flow

const { json2Interface } = require('./converter');
const { logError, logSuccess, log, LogColors } = require('./log');
const { differ } = require('./differ');
const innerDiffer = differ;
const fs = require('fs');
const child_process = require('child_process');
const ApiTypeFileNameSuffix = require('./suffix-of-file-name.config');

function saveReqParams(params: Object, reqParamsFilePath: string, interfacePrefixName: string): Promise<void> {
	// 保存res params interface
	if (params && Object.keys(params).length) {
		const reqparamsTypeFilePath = `${reqParamsFilePath}.${ApiTypeFileNameSuffix.reqparams.interface}`;
		const reqparamsTypeName = interfacePrefixName + 'ReqparamsI';
		return saveType({
			filePath: reqparamsTypeFilePath,
			name: reqparamsTypeName,
			sourceStr: json2Interface(params, reqparamsTypeName),
		});
	}
	return Promise.reject();
}

function saveJSON(filePath: string, content: string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, content, {}, (err) => {
			child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
			resolve();
		});
	});
}

function saveType(options: { name: string, filePath: string, sourceStr: string }): Promise<void> {
	const { filePath, name, sourceStr } = options;
	if (!sourceStr) {
		return Promise.reject();
	}
	return new Promise((resolve, reject) => {
		// console.log(interfaceStr);
		fs.writeFile(filePath, sourceStr, {}, (err) => {
			if (err) {
				logError(`${name}: save interface err`);
				logError(err);
				return;
			}
			child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
			logSuccess(`save ${filePath} success`);
			resolve();
		});
	});
}

module.exports = { saveReqParams, saveType, saveJSON };
