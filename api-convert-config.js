const Ajv = require('ajv');
function differ(data, oldData, type, oldType, oldSchema) {
	const ajv = new Ajv();
	if (oldSchema && data) {
		const validate = ajv.compile(oldSchema);
		const valid = validate(data);
		if (valid) {
			return false;
		}
	}

	return true;
}

module.exports = {
	/** 就是 http-proxy-middleware 的配置*/
	proxy: {
		target: 'https://jsonplaceholder.typicode.com',
		pathRewrite: {
			'^/api': '',
		},
		changeOrigin: true,
		secure: false,
	},
	differ, // for update
	port: 5800,
	enable: {
		jsonSchema: true,
		json: true,
	},
	filePath: {
		json: './sample/assets/api-json',
		types: './sample/src/api-types',
	},
	ignore: {
		methods: ['delete'],
		reqContentTypes: [],
		resContentTypes: ['application/octet-stream'],
	},
};
