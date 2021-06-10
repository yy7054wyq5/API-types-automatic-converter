# API-types-automatic-converter

代理 API，自动将请求参数和返回数据转为 ts。根据返回数据自动创建 json、[json-schema](https://json-schema.org/)，当给请求头添加 mock-response 并设置一个有效的值时
，将会把保存的 json 作为返回数据，进而实现 mock 的功能。开发此功能使用了[flow](https://flow.org/en/)作为静态检查工具。

## vscode 插件

vscode-flow-ide: An alternative Flowtype extension for Visual Studio Code. Flowtype is a static type checker ment to find errors in Javascript programs.

## 原理

1. 在前端和后端之间搭了一个中间服务器，通过反向代理让请求从该服务器过，从而劫持请求和响应做自动转换的功能。
2. 支持自定义 differ 函数来更新文件，因为接口大多会变化，所以 ts 需要更新，这个更新的判断就是这个 differ 函数的返回，返回 true 就强制更新文件，以最新的 ts 替换
   原来的。
3. differ 返回 true 也会重新生成请求参数的 ts

![avatar](./api-converter.png)

## 公司私有 npm 仓库发布地址

https://internal-nexus.haochang.tv/repository/npm-hc/

## 公司私有 npm 仓库下载地址

https://internal-nexus.haochang.tv/repository/npm/

## 开始使用

```cmd
npm -g i api-types-automatic-converter // 全局安装
cd [project dir] // 进入项目目录
api-convert-cli init // 执行初始化命令，将会在根目录生成一个配置文件，见‘配置说明’
api-convert-cli start // 修改配置文件后启动，将在本地启动一个服务，若端口设置为5800，那么该服务的地址就是http://localhost:5800
// 根据不同项目，修改已有的代理文件。如果是Angular，则需要将 proxy.conf.json 中的target地址改为http://localhost:5800
```

## 配置说明

\*\*配置中的 proxy 其实就是 http-proxy-middleware 的配置，但 onProxyReq 和 onProxyRes 是无效的，该库就是通过它们来劫持的 API\*\*

```js
const Ajv = require('ajv');
/**
 * 返回true就更新
 *
 * current: 当前请求返回
 * old: 已保存的请求返回
 * oldTypes: 已保存的请求返回ts内容
 * oldSchema: 已保存的json-schema
 */
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
	proxy: {
		target: 'https://jsonplaceholder.typicode.com', // 后端接口地址
		pathRewrite: {
			'^/api': '',
		},
		changeOrigin: true,
		secure: false,
	},
	differ: () => true, // for update
	port: 5800,
	enable: {
		jsonSchema: true, // 是否保存 jsonSchema
		json: true, // 是否保存 json
	},
	filePath: {
		json: './sample/assets/api-json',
		types: './sample/src/api-types',
	},
	// 需要忽略的
	ignore: {
		methods: ['delete'],
		reqContentTypes: [],
		resContentTypes: ['application/octet-stream'],
	},
};
```

## TODO

    1. [x]分离函数，声明类型
    2. [x]支持传入配置
    3. []对接json-server
