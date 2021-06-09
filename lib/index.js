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

const Table = require('cli-table');

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

const ApiTypeFileNameSuffix = require('./suffix-of-file-name.config');

const {
  differ
} = require('./differ');

const insideDiffer = differ;

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

  typeFileSavePath = `${typeFileSavePath}/api-types`;
  jsonFileSavePath = `${jsonFileSavePath}/api-json`;
  mkdirp.sync(typeFileSavePath);
  mkdirp.sync(jsonFileSavePath);
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

  if (!proxy.target) {
    logError('请配置接口的url！！！！！');
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
  } = mkdirs(filePath.types, filePath.json); // 保护内部的配置

  delete proxy.onProxyReq;
  delete proxy.onProxyRes;
  /**
   * 记录保存请求参数的函数，放到diff完后执行
   */

  function triggerSaveReqParams() {}

  const PROXY_CONFIG = { ...proxy,
    onProxyReq: (proxyReq, req, res) => {
      let {
        url,
        method
      } = req;
      const {
        typeFileSavePathHead,
        interfacePrefixName
      } = step(req, typeFileSavePath);
      const reqContentType = req.headers['content-type'];

      if (ignoreMethods.includes(method.toLowerCase())) {
        return;
      }

      if (ignoreReqContentTypes.includes(reqContentType)) {
        return;
      }

      const doSaveReqParams = (data, typeFileSavePathHead, interfacePrefixName) => {
        triggerSaveReqParams = () => {
          /* ------------log--------------- */
          console.log(' ');
          console.log(' ');
          console.log(' ');
          log('请求：-----------------------------------------------------------', LogColors.white);
          const table = new Table({
            head: ['url', 'method', 'content-type']
          });
          table.push([url, method, reqContentType || '']);
          console.log(table.toString()); // console.log('params:', JSON.stringify(data));

          /* ------------log--------------- */

          return saveReqParams(data, typeFileSavePathHead, interfacePrefixName);
        };
      };

      if (method === 'GET') {
        const params = getQueryParamsFromUrl(url);
        doSaveReqParams(params, typeFileSavePathHead, interfacePrefixName);
        return;
      }

      parsingBody(req, res, function (err, body) {
        if (err) {
          logError('发生错误');
          logError(err);
          return;
        }

        doSaveReqParams(body, typeFileSavePathHead, interfacePrefixName);
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // modify some information
      // body.age = 2;
      // delete body.version;
      const responseContentType = proxyRes.headers['content-type'];

      if (ignoreResContentTypes.includes(responseContentType)) {
        return;
      }

      modifyResponse(res, proxyRes, function (body) {
        let {
          url,
          method
        } = req;

        if (!url || !method) {
          logError(`${url}接口返回无效`);
          return body;
        }

        const {
          fileName,
          typeFileSavePathHead,
          interfacePrefixName
        } = step(req, typeFileSavePath);
        const resbodyTypeName = interfacePrefixName + 'ResbodyI';
        const resbodyJsonFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.json}`;
        const resbodyTypeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.resbody.interface}`;
        const schemaFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`;
        let oldJsonContent;
        let oldJsonSchemaContent;
        let oldTypeFileContent;

        try {
          oldJsonContent = fs.readFileSync(resbodyJsonFilePath);
          oldJsonSchemaContent = fs.readFileSync(schemaFilePath);
          oldTypeFileContent = fs.readFileSync(resbodyTypeFilePath);
        } catch (error) {
          console.error(error);
        }

        const oldJson = oldJsonContent ? JSON.parse(oldJsonContent.toString()) : null;
        const oldSchema = oldJsonSchemaContent ? JSON.parse(oldJsonSchemaContent.toString()) : null;
        const oldType = oldTypeFileContent ? oldTypeFileContent.toString() : null;
        const canUpdate = body && !oldType || (differ || insideDiffer)(body, oldJson, oldType, oldSchema);

        if (!canUpdate) {
          log(`save ${resbodyTypeFilePath} end, no update`, LogColors.blue);
          return;
        } // 保存res body interface


        if (body && Object.keys(body).length && canUpdate) {
          triggerSaveReqParams().then(() => {
            /* ------------log--------------- */
            log(' ', LogColors.white);
            log('响应：-----------------------------------------------------------', LogColors.white);
            const table = new Table({
              head: ['url', 'method', 'content-type']
            });
            table.push([url, method, responseContentType || '']);
            console.log(table.toString()); // console.log('body:', body);

            /* ------------log--------------- */

            saveType({
              name: resbodyTypeName,
              filePath: resbodyTypeFilePath,
              sourceStr: json2Interface(body, resbodyTypeName)
            }).then(() => {
              if (enableJson) {
                // 保存data
                return saveJSON(resbodyJsonFilePath, JSON.stringify(body)).then(() => {
                  logSuccess(`save json ${resbodyJsonFilePath} success`);
                });
              }
            }).then(() => {
              if (enableJsonSchema) {
                // 将interface转jsonschema
                saveJSON(schemaFilePath, ts2jsonschema({
                  fileName,
                  filePath: resbodyTypeFilePath,
                  tsTypeName: resbodyTypeName
                })).then(() => {
                  logSuccess(`save jsonschema ${schemaFilePath} success`);
                });
              }
            });
          });
        } // mock


        if (req.headers['mock-response']) {
          logSuccess('代理响应：返回mock数据');
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