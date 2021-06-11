function differ(params) {
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
	proxy: { target: 'https://jsonplaceholder.typicode.com', pathRewrite: { '^/api': '' }, changeOrigin: true, secure: false },
	port: 5800,
	enable: { jsonSchema: true, json: true },
	filePath: { json: './sample/assets/api-json', types: './sample/src/api-types' },
	ignore: { methods: ['delete', 'options'], reqContentTypes: [], resContentTypes: ['application/octet-stream'] },
};
