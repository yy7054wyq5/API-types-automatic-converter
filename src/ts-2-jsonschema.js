// @flow

const ts2schema = require('typescript-json-schema');
const { saveJSON } = require('./save-json');
const path = require('path');
const resolve = path.resolve;

function ts2jsonschema(options: { filePath: string, tsTypeName: string, fileName: string, jsonschemaFilePath: string }): void {
	const { filePath, fileName, tsTypeName, jsonschemaFilePath } = options;
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
	const program = ts2schema.getProgramFromFiles([resolve(filePath)], compilerOptions, basePath);
	// We can either get the schema for one file and one type...
	let schema = ts2schema.generateSchema(program, tsTypeName, settings);
	schema.$id = fileName;
	saveJSON(jsonschemaFilePath, JSON.stringify(schema));
}

module.exports = {
	ts2jsonschema,
};
