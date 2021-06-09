const Ajv = require('ajv');
function differ(current, old, oldTypes, oldSchema) {
	// console.log('current', current, typeof current);
	// console.log('old', old);
	// console.log('oldTypes', oldTypes);
	// console.log('oldSchema', oldSchema);
	const ajv = new Ajv();
	if (oldSchema && current) {
		const validate = ajv.compile(oldSchema);
		const valid = validate(current);
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
	differ: () => true, // for update
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
