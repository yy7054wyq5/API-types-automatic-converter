module.exports = {
	proxyApiUrl: '',
	differ: null,
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
