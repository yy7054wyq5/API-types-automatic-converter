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
		jsonSchema: true,
		json: true,
	},
	filePath: {
		json: './sample/assets',
		types: './sample/src',
	},
	ignore: {
		methods: ['delete'],
		reqContentTypes: [],
		resContentTypes: ['application/octet-stream'],
	},
};
