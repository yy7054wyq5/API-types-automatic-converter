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
	differ: null, // for update
	port: 5800,
	enable: {
		jsonSchema: false,
		json: false,
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
