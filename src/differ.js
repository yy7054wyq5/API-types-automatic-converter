// @flow

// function differ(data: string, interfaceStr: string): boolean {
// 	return data &&
// 		data.indexOf('//') < 0 && // 没有斜杠注释
// 		data.indexOf('import {') < 0 && // 没有import关键字
// 		interfaceStr.replace(/ /g, '').length > data.toString().replace(/ /g, '').length // 新的类型定义长度大于原来的
// 		? true
// 		: false;
// }

export type DifferParams = {
	data: Object,
	oldData: Object | null,
	typeContent: string,
	oldTypeContent: string | null,
	schema?: Object,
};

function differ(params: DifferParams): boolean {
	const Ajv = require('ajv');
	const { data, schema } = params;
	const ajv = new Ajv();
	if (schema && data) {
		const validate = ajv.compile(schema);
		const valid = validate(data);
		if (valid) {
			return false;
		}
	}

	return true;
}

module.exports = {
	differ,
};
