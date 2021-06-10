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

  return getModuleFromFile(content, 'api-convert-config.js').exports;
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
    log('请配置文件存放路径：filePath中的json和types', LogColors.redBG);
    return;
  }

  mkdirp.sync(typeFileSavePath);
  mkdirp.sync(jsonFileSavePath);
  return {
    typeFileSavePath,
    jsonFileSavePath
  };
}

function getOldContent(typeFilePath, jsonFilePath, schemaFilePath) {
  let oldJsonContent;
  let oldJsonSchemaContent;
  let oldTypeFileContent;

  try {
    oldJsonContent = fs.readFileSync(jsonFilePath);
  } catch (error) {}

  try {
    oldJsonSchemaContent = fs.readFileSync(schemaFilePath);
  } catch (error) {}

  try {
    oldTypeFileContent = fs.readFileSync(typeFilePath);
  } catch (error) {}

  const oldJson = oldJsonContent ? JSON.parse(oldJsonContent.toString()) : null;
  const oldSchema = oldJsonSchemaContent ? JSON.parse(oldJsonSchemaContent.toString()) : null;
  const oldType = oldTypeFileContent ? oldTypeFileContent.toString() : null;
  return {
    json: oldJson,
    schema: oldSchema,
    type: oldType
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
      const reqparamsTypeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.reqparams.interface}`;
      const reqContentType = req.headers['content-type'];

      if (ignoreMethods.map(i => i.toLowerCase()).includes(method.toLowerCase())) {
        return;
      }

      if (ignoreReqContentTypes.includes(reqContentType)) {
        return;
      }

      const doSaveReqParams = data => {
        triggerSaveReqParams = () => {
          /* ------------log--------------- */
          console.log(' ');
          console.log('-'.repeat(90));
          const table = new Table({
            head: ['', 'url', 'method', 'content-type']
          });
          table.push(['request', url, method, reqContentType || '']);
          console.log(table.toString()); // console.log('body:', body);

          /* ------------log--------------- */

          const {
            type: oldType
          } = getOldContent(reqparamsTypeFilePath);
          const typeContent = json2Interface(data, `${interfacePrefixName}ReqparamsI`);
          const canUpdate = data && !oldType || (differ || insideDiffer)(data, null, typeContent, oldType);

          if (!canUpdate) {
            log(`${reqparamsTypeFilePath} not update`, LogColors.blue);
            return;
          }

          return saveReqParams(data, reqparamsTypeFilePath, interfacePrefixName);
        };
      };

      if (method === 'GET') {
        const params = getQueryParamsFromUrl(url);
        doSaveReqParams(params);
        return;
      }

      parsingBody(req, res, function (err, body) {
        if (err) {
          logError('发生错误');
          logError(err);
          return;
        }

        doSaveReqParams(body);
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
          logError('url或method无效');
          return body;
        }

        if (ignoreMethods.map(i => i.toLowerCase()).includes(method.toLowerCase())) {
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
        const schemaFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`; // mock

        if (req.headers['mock-response']) {
          logSuccess('代理响应：返回mock数据');
          res.statusCode = StatusCodes.OK;

          try {
            return JSON.parse(fs.readFileSync(resbodyJsonFilePath).toString());
          } catch (error) {}

          return body;
        }

        if (!body || typeof body === 'object' && !Object.keys(body).length) {
          logError('请禁用浏览器缓存或检查该请求的响应是否正常，cli无法捕获正常的响应体');
          return body;
        } // 将参数的保存置于此处，是为了保证日志按序输出


        return triggerSaveReqParams().then(() => {
          const {
            json,
            schema,
            type: oldType
          } = getOldContent(resbodyTypeFilePath, resbodyJsonFilePath, schemaFilePath);
          /* ------------log--------------- */

          const table = new Table({
            head: ['', 'url', 'method', 'content-type']
          });
          table.push(['response', url, method, req.headers['content-type'] || '']);
          console.log(table.toString()); // console.log('body:', body);

          /* ------------log--------------- */

          const typeContent = json2Interface(body, resbodyTypeName);
          const canUpdate = body && !oldType || (differ || insideDiffer)(body, json, typeContent, oldType, schema);

          if (!canUpdate) {
            log(`${resbodyTypeFilePath} not update`, LogColors.blue);
            return body;
          }

          saveType({
            name: resbodyTypeName,
            filePath: resbodyTypeFilePath,
            sourceStr: typeContent
          }).then(() => {
            if (enableJson) {
              // 保存data
              saveJSON(resbodyJsonFilePath, JSON.stringify(body)).then(() => {
                logSuccess(`save json ${resbodyJsonFilePath} success`);
              });
            }

            if (enableJsonSchema) {
              // 将interface转jsonschema
              const schemaContent = ts2jsonschema({
                fileName,
                filePath: resbodyTypeFilePath,
                tsTypeName: resbodyTypeName
              });
              saveJSON(schemaFilePath, schemaContent).then(() => {
                logSuccess(`save jsonschema ${schemaFilePath} success`);
              });
            }
          });
          return body; // return value can be a promise
        });
      });
    }
  };
  const app = express();
  const apiProxy = createProxyMiddleware(PROXY_CONFIG);
  app.use(function (req, res, next) {
    next();
  });
  app.use(apiProxy);
  app.listen(port);
});
program.parse();