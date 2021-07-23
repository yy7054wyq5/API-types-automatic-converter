import { DifferParams, APIConverterConfig } from 'api-types-automatic-converter';

function differ(params: DifferParams): boolean {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Ajv = require('ajv');
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { data, oldData, typeContent, oldTypeContent, schema } = params;
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
	proxy: { target: 'https://jsonplaceholder.typicode.com', pathRewrite: { '^/api': '' }, changeOrigin: true, secure: false },
	updateStrategy: 'cover',
	port: 5800,
	filePath: { json: './sample/assets/api-json', types: './sample/src/api-types' },
	ignore: { urls: [], methods: ['delete', 'options'], reqContentTypes: [], resContentTypes: ['application/octet-stream'] },
} as APIConverterConfig;
