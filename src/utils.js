// @flow

const fs = require('fs');
const mkdirp = require('mkdirp');
const { log, LogColors, logSuccess, logError } = require('./log');

function firstUpperCase(str: string): string {
	const [first, ...rest] = str.split('');
	return first.toUpperCase() + rest.join('');
}

function getQueryParamsFromUrl(url: string): Object {
	const paramsIndex = url.indexOf('?');
	if (paramsIndex < 1) {
		return {};
	}
	const str = url.substring(paramsIndex + 1, url.length);
	const arr = str.split('&');
	const tmp = {};
	arr.map((item) => {
		const [key, value] = item.split('=');
		tmp[key] = value;
	});
	return tmp;
}

function line2Hump(str: string): string {
	if (!str) {
		return '';
	}
	var strArr = str.split('');
	var hasLine = str.indexOf('-') > -1;
	// console.log(hasLine);
	for (var index = 0; index < strArr.length; index++) {
		var element = strArr[index];
		if (element === '-') {
			if (strArr[index + 1]) {
				strArr[index + 1] = strArr[index + 1].toUpperCase();
			}
			// console.log(element);
		} else if (/^[A-Z]/.test(element) && !hasLine) {
			strArr[index] = '-' + element.toLowerCase();
		}
	}
	if (hasLine) {
		return strArr.join('').replace(/-/g, '');
	}
	return strArr.join('');
}

function mkdirs(typeFileSavePath: string, jsonFileSavePath: string): { typeFileSavePath: string | null, jsonFileSavePath: string | null } {
	if (!typeFileSavePath || !jsonFileSavePath) {
		log('请配置文件存放路径：filePath中的json和types', LogColors.redBG);
		return {
			typeFileSavePath: null,
			jsonFileSavePath: null,
		};
	}

	mkdirp.sync(typeFileSavePath);
	mkdirp.sync(jsonFileSavePath);

	return {
		typeFileSavePath,
		jsonFileSavePath,
	};
}

function getFileContent(
	typeFilePath: string,
	jsonFilePath?: string,
	schemaFilePath?: string
): {
	json: Object | null,
	schema: Object | null,
	type: string | null,
} {
	let jsonContent;
	let jsonSchemaContent;
	let typeFileContent;

	if (jsonFilePath) {
		try {
			jsonContent = fs.readFileSync(jsonFilePath);
		} catch (error) {}
	}

	if (schemaFilePath) {
		try {
			jsonSchemaContent = fs.readFileSync(schemaFilePath);
		} catch (error) {}
	}

	try {
		typeFileContent = fs.readFileSync(typeFilePath);
	} catch (error) {}

	const oldJson = jsonContent ? JSON.parse(jsonContent.toString()) : null;
	const oldSchema = jsonSchemaContent ? JSON.parse(jsonSchemaContent.toString()) : null;
	const oldType = typeFileContent ? typeFileContent.toString() : null;
	return {
		json: oldJson,
		schema: oldSchema,
		type: oldType,
	};
}

module.exports = { line2Hump, getQueryParamsFromUrl, firstUpperCase, mkdirs, getFileContent };
// console.log(getQueryParamsFromUrl('djada?a=2&djjajda=djadjas'));
