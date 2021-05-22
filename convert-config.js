module.exports = {
	proxy: {
		target: 'https://jsonplaceholder.typicode.com',
		pathRewrite: {
			'^/api': '',
		},
		changeOrigin: true,
		secure: false,
	},
	differ: null, // for update
	port: 5400,
	enable: {
		jsonSchema: false,
		json: false,
	},
	ignore: {
		methods: ['delete'],
		reqContentTypes: [],
		resContentTypes: ['application/octet-stream'],
	},
};
