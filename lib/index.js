#!/usr/bin/env node

const nodeModule = require('module');

const fs = require('fs');

const vm = require('vm');

const express = require('express');

const program = require('commander');

const parsingBody = require('body/any');

const child_process = require('child_process');

const {
  StatusCodes
} = require('http-status-codes');

const modifyResponse = require('node-http-proxy-json');

const {
  createProxyMiddleware
} = require('http-proxy-middleware');

const mkdirp = require('mkdirp');

const {
  init,
  ConfigPath,
  DefaultApiUrl
} = require('./init');

const {
  saveJSON,
  saveReqParams,
  saveType
} = require('./save');

const {
  json2Interface,
  ts2jsonschema
} = require('./converter');

const {
  log,
  LogColors,
  logSuccess,
  logError
} = require('./log');

const {
  firstUpperCase,
  line2Hump,
  getQueryParamsFromUrl
} = require('./utils');

function readConfig() {
  const content = fs.readFileSync(ConfigPath);

  const getModuleFromFile = (bundle, filename) => {
    const m = {
      exports: {}
    };
    const wrapper = nodeModule.wrap(bundle);
    const script = new vm.Script(wrapper, {
      filename,
      displayErrors: true
    });
    const result = script.runInThisContext(); // 此处可以指定代码的执行环境，此api在nodejs文档中有介绍

    result.call(m.exports, m.exports, require, m); // 执行wrapper函数，此处传入require就解决了第一种方法不能require的问题

    return m;
  };

  return getModuleFromFile(content, 'convert-config.js').exports;
}

function step(req, typeFileSavePath) {
  let {
    url,
    method
  } = req;
  method = method.toLowerCase(); // 方法名转小写

  let api = url;
  const urlParamsIndex = api.indexOf('?');

  if (urlParamsIndex > 0) {
    api = api.split('?')[0];
  } // 过滤掉api上的非小写字母和短横线的部分


  const apiArr = api.split('/').filter(word => /^[a-z-]+$/g.test(word));
  api = apiArr.join('-'); // 斜杠改为短横线

  const fileName = `${method}.${api}`; // 拼接文件名

  const typeFileSavePathHead = `${typeFileSavePath}/${fileName}`;
  const interfacePrefixName = firstUpperCase(method) + line2Hump('-' + api);
  return {
    fileName,
    interfacePrefixName,
    typeFileSavePathHead
  };
}

function mkdirs(typeFileSavePath, jsonFileSavePath) {
  if (!typeFileSavePath || !jsonFileSavePath) {
    console.error('请配置文件存放路径');
    return;
  }

  typeFileSavePath = `${typeFileSavePath}/api-types/`;
  jsonFileSavePath = `${jsonFileSavePath}/api-json/`;
  return {
    typeFileSavePath,
    jsonFileSavePath
  };
}

program.command('init').description('初始配置').action(() => init());
program.command('start').description('转换器启动').action(() => {
  const {
    proxy,
    differ,
    enable,
    ignore,
    port,
    filePath
  } = readConfig();

  if (DefaultApiUrl === proxy.apiUrl) {
    logError('请配置接口的url');
    return;
  }

  const {
    jsonSchema: enableJsonSchema,
    json: enableJson
  } = enable;
  const {
    methods: ignoreMethods,
    reqContentTypes: ignoreReqContentTypes,
    resContentTypes: ignoreResContentTypes
  } = ignore;
  const {
    typeFileSavePath,
    jsonFileSavePath
  } = mkdirs(filePath.types, filePath.json);
  const ApiTypeFileNameSuffix = {
    resbody: {
      json: 'resbody.json',
      interface: 'resbody.interface.ts',
      jsonschema: 'resbody.jsonschema.json'
    },
    reqparams: {
      interface: 'reqparams.interface.ts'
    }
  };
  const PROXY_CONFIG = { ...proxy,
    onProxyReq: (proxyReq, req, res) => {
      logSuccess('api-types-creater-serve.js onProxyReq');
      let {
        url,
        method
      } = req;
      const {
        typeFileSavePathHead,
        interfacePrefixName
      } = step(req, typeFileSavePath);

      if (ignoreMethods.includes(method.toLowerCase())) {
        return;
      }

      if (ignoreReqContentTypes.includes(req.headers['content-type'])) {
        return;
      }

      if (method === 'GET') {
        const params = getQueryParamsFromUrl(url);
        saveReqParams(params, `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.reqparams.interface}`, interfacePrefixName);
        return;
      }

      parsingBody(req, res, function (err, body) {
        if (err) {
          logError('onProxyReq handle req body err');
          logError(err);
          return;
        }

        saveReqParams(body, typeFileSavePathHead, interfacePrefixName);
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // modify some information
      // body.age = 2;
      // delete body.version;
      logSuccess('api-types-creater-serve.js onProxyRes');
      console.log('req.url', req.url);
      console.log('req.method', req.method);
      console.log('req.originalUrl', req.originalUrl);
      console.log('req.params', req.params);

      if (ignoreResContentTypes.includes(proxyRes.headers['content-type'])) {
        return;
      }

      modifyResponse(res, proxyRes, function (body) {
        let {
          url,
          method
        } = req;

        if (!url || !method) {
          logError(`${url}: 接口返回无效`);
          return body;
        }

        const {
          fileName,
          typeFileSavePathHead,
          interfacePrefixName
        } = step(req, typeFileSavePath);
        const resbodyJsonFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.json}`; // 保存res body interface

        if (body && Object.keys(body).length) {
          const resbodyTypeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.resbody.interface}`;
          const resbodyTypeName = interfacePrefixName + 'ResbodyI';
          saveType({
            filePath: resbodyTypeFilePath,
            name: resbodyTypeName,
            sourceStr: json2Interface(body, resbodyTypeName),
            differ
          }).then(() => {
            if (enableJson) {
              // 保存data
              saveJSON(resbodyJsonFilePath, JSON.stringify(body));
            }

            if (enableJsonSchema) {
              // 将interface转jsonschema
              saveJSON(`${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`, ts2jsonschema({
                fileName,
                filePath: resbodyTypeFilePath,
                tsTypeName: resbodyTypeName
              }));
            }
          });
        } // mock


        if (req.headers['mock-response']) {
          res.statusCode = StatusCodes.OK;

          try {
            return JSON.parse(fs.readFileSync(resbodyJsonFilePath).toString());
          } catch (error) {
            console.log(error);
            return body;
          }
        }

        return body; // return value can be a promise
      });
    }
  };
  const app = express();
  const apiProxy = createProxyMiddleware(PROXY_CONFIG);
  app.use(function (req, res, next) {
    // console.log('\n\nHeaders');
    // console.log(req.headers);
    // console.log('\nQuery');
    // console.log(req.query);
    // console.log('\nBody');
    // console.log(req.body);
    next();
  });
  app.use(apiProxy);
  app.listen(port);
});
program.parse();