# API-types-automatic-converter

代理 API，自动将请求参数和返回数据转为 ts。根据返回数据自动创建 json、[json-schema](https://json-schema.org/)，当给请求头添加 mock-response 并设置一个有效的值时
，将会把保存的 json 作为返回数据，进而实现 mock 的功能。开发此功能使用了[flow](https://flow.org/en/)作为静态检查工具。

## vscode 插件

vscode-flow-ide: An alternative Flowtype extension for Visual Studio Code. Flowtype is a static type checker ment to find errors in Javascript programs.

## 原理

1. 启动一个处于在前端和后端的中间服务器，通过反向代理让请求从该服务器过，从而劫持请求和响应做自动转换的功能。
2. 支持自定义 differ() 来更新文件，因为接口大多会变化，所以 ts 需要更新，是强制更新文件，以最新的 ts 替换原来的。
3. 请求参数和返回数据都通过 differ() 的返回来决定是否更新，两者的参数略有不同。

![avatar](./api-converter.png)

## 更新策略

覆盖或追加，见配置的 updateStrategy

## 公司私有 npm 仓库发布地址

https://internal-nexus.haochang.tv/repository/npm-hc/

## 公司私有 npm 仓库下载地址

https://internal-nexus.haochang.tv/repository/npm/

## 开始使用

```cmd
npm -g i api-types-automatic-converter // 全局安装
cd [project dir] // 进入项目目录
api-convert-cli init // 执行初始化命令，将会在根目录生成一个配置文件，见‘配置说明’
api-convert-cli start // 修改配置文件后启动，将在本地启动一个服务，若端口设置为5800，那么该服务的地址就是 http://localhost:5800
// 根据不同项目，修改已有的代理文件。如果是Angular，则需要将 proxy.conf.json 中的target地址改为 http://localhost:5800
```

## 配置说明

\*\*配置中的 proxy 其实就是 http-proxy-middleware 的配置，但 onProxyReq 和 onProxyRes 是无效的，该库就是通过它们来劫持的 API\*\*

```js
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
	updateStrategy: 'cover', // 'cover' | 'append'
	proxy: { target: 'https://jsonplaceholder.typicode.com', pathRewrite: { '^/api': '' }, changeOrigin: true, secure: false },
	port: 5800,
	filePath: { json: './sample/assets/api-json', types: './sample/src/api-types' },
	ignore: { methods: ['delete', 'options'], reqContentTypes: [], resContentTypes: ['application/octet-stream'] },
};
```

## TODO

    1. [x]分离函数，声明类型
    2. [x]支持传入配置
    3. []对接json-server
