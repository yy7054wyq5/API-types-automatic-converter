import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import { log, LogColors } from './log';

function firstUpperCase(str: string): string {
	const [first, ...rest] = str.split('');
	return first.toUpperCase() + rest.join('');
}

function getQueryParamsFromUrl(url: string): any {
	const paramsIndex = url.indexOf('?');
	if (paramsIndex < 1) {
		return {};
	}
	const str = url.substring(paramsIndex + 1, url.length);
	const arr = str.split('&');
	const tmp = {};
	arr.map((item) => {
		const [key, value] = item.split('=') as string[];
		tmp[key] = value;
	});
	return tmp;
}

function line2Hump(str: string): string {
	if (!str) {
		return '';
	}
	const strArr = str.split('');
	const hasLine = str.indexOf('-') > -1;
	// console.log(hasLine);
	for (let index = 0; index < strArr.length; index++) {
		const element = strArr[index];
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

function mkdirs(typeFileSavePath: string, jsonFileSavePath: string): { typeFileSavePath: string | null; jsonFileSavePath: string | null } {
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
	json: any | null;
	schema: any | null;
	type: string | null;
} {
	let jsonContent;
	let jsonSchemaContent;
	let typeFileContent;

	if (jsonFilePath) {
		try {
			jsonContent = fs.readFileSync(jsonFilePath);
		} catch (error) {
			console.log();
		}
	}

	if (schemaFilePath) {
		try {
			jsonSchemaContent = fs.readFileSync(schemaFilePath);
		} catch (error) {
			console.log();
		}
	}

	try {
		typeFileContent = fs.readFileSync(typeFilePath);
	} catch (error) {
		console.log();
	}

	const oldJson = jsonContent ? JSON.parse(jsonContent.toString()) : null;
	const oldSchema = jsonSchemaContent ? JSON.parse(jsonSchemaContent.toString()) : null;
	const oldType = typeFileContent ? typeFileContent.toString() : null;
	return {
		json: oldJson,
		schema: oldSchema,
		type: oldType,
	};
}

export { line2Hump, getQueryParamsFromUrl, firstUpperCase, mkdirs, getFileContent };
// console.log(getQueryParamsFromUrl('djada?a=2&djjajda=djadjas'));
