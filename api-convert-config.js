function differ(params) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	var Ajv = require('ajv');
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	var data = params.data,
		oldData = params.oldData,
		typeContent = params.typeContent,
		oldTypeContent = params.oldTypeContent,
		schema = params.schema;
	var ajv = new Ajv();
	if (schema && data) {
		var validate = ajv.compile(schema);
		var valid = validate(data);
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
};
