function differ(params) {
	const Ajv = require('ajv');

	const { data, oldData, typeContent, oldTypeContent, schema } = params;
	const ajv = new Ajv();

	// if (schema && data) {
	// 	const validate = ajv.compile(schema);
	// 	const valid = validate(data);

	// 	if (valid) {
	// 		return false;
	// 	}
	// }

	return true;
}
module.exports = {
	differ,
	proxy: { target: 'https://jsonplaceholder.typicode.com', pathRewrite: { '^/api': '' }, changeOrigin: true, secure: false },
	updateStrategy: 'append',
	port: 5800,
	filePath: { json: './sample/assets/api-json', types: './sample/src/api-types' },
	ignore: { methods: ['delete', 'options'], urls: [], reqContentTypes: [], resContentTypes: ['application/octet-stream'] },
};
