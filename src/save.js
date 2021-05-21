// @flow

const { json2Interface } = require('./converter');
const { logError, logSuccess } = require('./log');
const { differ } = require('./differ');
const innerDiffer = differ;
const fs = require('fs');
const child_process = require('child_process');

function saveReqParams(params: Object, reqParamsFilePath: string, interfacePrefixName: string) {
	// 保存res params interface
	if (params && Object.keys(params).length) {
		const reqparamsTypeName = interfacePrefixName + 'ReqparamsI';
		saveType({
			filePath: reqParamsFilePath,
			name: reqparamsTypeName,
			sourceStr: json2Interface(params, reqparamsTypeName),
		});
	}
}

function saveJSON(filePath: string, content: string) {
	logSuccess(`save JSON ${filePath} start`);
	fs.writeFile(filePath, content, {}, (err) => {
		child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
		logSuccess(`update ${filePath} success`);
	});
}

function saveType(options: { name: string, filePath: string, sourceStr: string, differ?: (pre: string, current: string) => boolean }): Promise<void> {
	const { filePath, name, sourceStr, differ } = options;
	logSuccess(`save ${filePath} start`);
	if (!sourceStr) {
		return Promise.reject();
	}
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, {}, (err, data) => {
			const interfaceStr = sourceStr;
			let diff = data && (differ ? differ(data.toString(), interfaceStr) : innerDiffer(data.toString(), interfaceStr));
			if (err || !data || diff) {
				logSuccess(`save ${filePath} end`);
				// console.log(interfaceStr);
				fs.writeFile(filePath, interfaceStr, {}, (err) => {
					if (err) {
						logError(`${name}: save interface err`);
						logError(err);
						return;
					}
					child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
					logSuccess(`update ${filePath} success`);
					resolve();
				});
				return;
			}
			logSuccess(`save ${filePath} end: no update`);
		});
	});
}

module.exports = { saveReqParams, saveType, saveJSON };
