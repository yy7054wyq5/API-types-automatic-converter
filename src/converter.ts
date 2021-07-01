import * as json2ts from 'json-to-ts';
import * as TJS from 'typescript-json-schema';
import * as path from 'path';
const resolve = path.resolve;
import { logError } from './log';

function putInterfaceName(sourceStr: string, interfaceName: string): string {
	let editedStr = sourceStr;
	editedStr = editedStr.replace(/ any/g, 'unknown');
	return editedStr.replace(/interface RootObject/, `export interface ${interfaceName}`); // 重写接口
}

function json2Interface(data: unknown, interfaceName: string): string {
	if (!data) {
		return '';
	}
	try {
		const str = json2ts.default(data).toString().replace(/,/g, ' ');
		return putInterfaceName(str, interfaceName);
	} catch (error) {
		logError('json2Interface.js json2Interface error');
		logError(error);
		return '';
	}
}

function ts2jsonschema(options: { filePath: string; tsTypeName: string; fileName: string }): string {
	const { filePath, fileName, tsTypeName } = options;
	// optionally pass argument to schema generator
	const settings = {
		required: true,
		uniqueNames: true,
	};
	// optionally pass ts compiler options
	const compilerOptions = {
		strictNullChecks: true,
	};
	// optionally pass a base path
	const basePath = './';
	const program = TJS.getProgramFromFiles([resolve(filePath)], compilerOptions, basePath);
	// We can either get the schema for one file and one type...
	const schema = TJS.generateSchema(program, tsTypeName, settings);
	schema.$id = fileName;
	return JSON.stringify(schema);
}

export { json2Interface, ts2jsonschema };
