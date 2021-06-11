const fs = require('fs'); // node --experimental-modules ./lib/init.js
// 14.16.1 可以不写 --experimental-modules


const ConfigPath = './api-convert-config.js';
const DefaultApiUrl = 'https://jsonplaceholder.typicode.com';

const {
  differ
} = require('./differ');

const child_process = require('child_process');

const defaultConfig = {
  proxy: {
    target: DefaultApiUrl,
    pathRewrite: {
      '^/api': ''
    },
    changeOrigin: true,
    secure: false
  },
  differ,
  // for update
  port: 5800,
  enable: {
    jsonSchema: true,
    json: true
  },
  filePath: {
    json: './sample/assets/api-json',
    types: './sample/src/api-types'
  },
  ignore: {
    methods: ['delete', 'options'],
    reqContentTypes: [],
    resContentTypes: ['application/octet-stream']
  }
};

function init() {
  let configContent = JSON.stringify(defaultConfig); // 该方法会把函数丢弃

  configContent = configContent.replace('{', '{ differ,'); // 把函数补上

  const content = `
		${differ.toString()}
		module.exports = ${configContent};
	`;
  fs.writeFile(ConfigPath, content, () => {});
  child_process.exec(`prettier --config ./.prettierrc.json --write ${ConfigPath}`);
} // init();


module.exports = {
  init,
  DefaultApiUrl,
  ConfigPath
};