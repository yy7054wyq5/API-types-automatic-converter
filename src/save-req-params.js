// @flow

const { saveType } = require('./save-type');
const { json2Interface } = require('./json-2-interface');

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

module.exports = { saveReqParams };
