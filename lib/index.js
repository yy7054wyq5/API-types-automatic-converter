#!/usr/bin/env node
// $FlowFixMe

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

const {
  init,
  ConfigPath,
  DefaultApiUrl
} = require('./init');

const {
  saveJSON,
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
  getQueryParamsFromUrl,
  getFileContent,
  mkdirs
} = require('./utils');

const ApiTypeFileNameSuffix = require('./suffix-of-file-name.config');

const {
  differ
} = require('./differ');

const insideDiffer = differ;
const Latest = 'Latest';

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

function apiLog(data, tag) {
  console.log(' ');

  if (tag === 'request') {
    console.log('-'.repeat(90));
  }

  log(tag, LogColors.yellow);
  console.log('url:', data.url);
  console.log('method:', data.method);
  console.log('content-type:', data.headers['content-type'] || '');
}

function ignoreProxy(req, ignoreUrls, ignoreMethods) {
  const {
    url,
    method
  } = req;

  for (const ignoreUrl of ignoreUrls) {
    if (url.indexOf(ignoreUrl) > -1) {
      return true;
    }
  }

  if (ignoreMethods.map(i => i.toLowerCase()).includes(method.toLowerCase())) {
    return true;
  }

  return false;
}

function creatTmpTSFile(filePath, content) {
  const newContentFilePath = filePath.split('.ts')[0] + '.tmp' + '.ts';

  if (content) {
    fs.writeFileSync(newContentFilePath, content);
  }

  return newContentFilePath;
}

program.command('init').description('初始化配置').action(() => init());
program.command('start').description('转换服务启动').action(() => {
  const {
    proxy,
    differ,
    ignore,
    port,
    filePath,
    updateStrategy
  } = readConfig();

  const _differ = differ || insideDiffer;

  if (!proxy.target) {
    logError('请配置接口的url');
    return;
  }

  const {
    methods: ignoreMethods,
    urls: ignoreUrls,
    reqContentTypes: ignoreReqContentTypes,
    resContentTypes: ignoreResContentTypes
  } = ignore;
  const {
    typeFileSavePath,
    jsonFileSavePath
  } = mkdirs(filePath.types, filePath.json);

  if (!typeFileSavePath || !jsonFileSavePath) {
    logError('请配置有效的文件存放路径');
    return;
  }
  /**
   * 记录保存请求参数的函数，放到diff完后执行
   */


  let triggerSaveReqParams = () => {
    return Promise.resolve();
  };
  /**
   * 代理请求
   */


  const onProxyReq = (proxyReq, req, res) => {
    let {
      url,
      method
    } = req;
    const {
      typeFileSavePathHead,
      interfacePrefixName
    } = step(req, typeFileSavePath);
    const typeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.reqparams.interface}`;
    const contentType = req.headers['content-type'];
    const typeName = `${interfacePrefixName}ReqparamsI`;

    if (ignoreReqContentTypes.includes(contentType)) {
      return;
    }

    if (ignoreProxy(req, ignoreUrls, ignoreMethods)) {
      return;
    }

    const doSaveReqParams = data => {
      triggerSaveReqParams = () => {
        apiLog(req, 'request');
        const {
          type: oldTypeContent
        } = getFileContent(typeFilePath);
        const typeContent = json2Interface(data, typeName);

        const canUpdate = data && !oldTypeContent || _differ({
          data,
          oldData: null,
          typeContent,
          oldTypeContent
        });

        if (!canUpdate) {
          log(`${typeFilePath} not update`, LogColors.blue);
          return Promise.resolve();
        }

        let updateContent = typeContent;

        if (updateStrategy === 'append' && oldTypeContent && oldTypeContent.indexOf(Latest) === -1) {
          updateContent = `${oldTypeContent || ''} ${json2Interface(data, typeName + Latest)}`;
        }

        log('update' + typeFilePath, LogColors.cyanBG);
        return saveType({
          filePath: typeFilePath,
          content: updateContent
        });
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
  };
  /**
   * 代理响应
   */


  const onProxyRes = (proxyRes, req, res) => {
    const responseContentType = proxyRes.headers['content-type'];

    if (ignoreResContentTypes.includes(responseContentType)) {
      return;
    }

    if (ignoreProxy(req, ignoreUrls, ignoreMethods)) {
      return;
    }

    modifyResponse(res, proxyRes, function (body) {
      // modify some information
      // body.age = 2;
      // delete body.version;
      let {
        url,
        method
      } = req;

      if (!url || !method) {
        logError('url或method无效');
        return body;
      }

      const {
        fileName,
        typeFileSavePathHead,
        interfacePrefixName
      } = step(req, typeFileSavePath);
      const typeName = interfacePrefixName + 'ResbodyI';
      const jsonFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.json}`;
      const typeFilePath = `${typeFileSavePathHead}.${ApiTypeFileNameSuffix.resbody.interface}`;
      const schemaFilePath = `${jsonFileSavePath}/${fileName}.${ApiTypeFileNameSuffix.resbody.jsonschema}`; // mock

      if (req.headers['mock-response']) {
        logSuccess('代理响应：返回mock数据');
        res.statusCode = StatusCodes.OK;

        try {
          return JSON.parse(fs.readFileSync(jsonFilePath).toString());
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
          type: oldTypeContent
        } = getFileContent(typeFilePath, jsonFilePath, schemaFilePath);
        apiLog({
          url,
          method,
          headers: proxyRes.headers
        }, 'response');
        const typeContent = json2Interface(body, typeName);

        const canUpdate = body && !oldTypeContent || _differ({
          data: body,
          oldData: json,
          typeContent,
          oldTypeContent,
          schema
        });

        if (!canUpdate) {
          log(`${typeFilePath} not update`, LogColors.blue);
          return body;
        }

        let updateContent = typeContent;
        let tmpTSFilePath = '';

        if (updateStrategy === 'append' && oldTypeContent && oldTypeContent.indexOf(Latest) === -1) {
          updateContent = `${oldTypeContent || ''} ${json2Interface(body, typeName + Latest)}`;
          tmpTSFilePath = creatTmpTSFile(typeFilePath, typeContent);
        }

        log('update' + typeFilePath, LogColors.cyanBG);
        saveType({
          filePath: typeFilePath,
          content: updateContent
        }).then(() => {
          // 保存data
          saveJSON(jsonFilePath, JSON.stringify(body)).then(() => {}); // 将interface转jsonschema

          const schemaContent = ts2jsonschema({
            fileName,
            filePath: tmpTSFilePath || typeFilePath,
            tsTypeName: typeName
          });
          saveJSON(schemaFilePath, schemaContent).then(() => {
            fs.unlinkSync(tmpTSFilePath);
          });
        });
        return body; // return value can be a promise
      });
    });
  };

  const PROXY_CONFIG = { ...proxy,
    onProxyReq,
    onProxyRes
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