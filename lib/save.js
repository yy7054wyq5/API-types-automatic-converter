const {
  json2Interface
} = require('./converter');

const {
  logError,
  logSuccess
} = require('./log');

const {
  differ
} = require('./differ');

const innerDiffer = differ;

const fs = require('fs');

const child_process = require('child_process');

const ApiTypeFileNameSuffix = require('./suffix-of-file-name.config');

function saveReqParams(params, reqParamsFilePath, interfacePrefixName) {
  // 保存res params interface
  if (params && Object.keys(params).length) {
    const reqparamsTypeFilePath = `${reqParamsFilePath}.${ApiTypeFileNameSuffix.reqparams.interface}`;
    const reqparamsTypeName = interfacePrefixName + 'ReqparamsI';
    return saveType({
      filePath: reqparamsTypeFilePath,
      name: reqparamsTypeName,
      sourceStr: json2Interface(params, reqparamsTypeName)
    });
  }

  return Promise.reject();
}

function saveJSON(filePath, content) {
  return new Promise((resolve, reject) => {
    logSuccess(`save ${filePath} start`);
    fs.writeFile(filePath, content, {}, err => {
      logSuccess(`save ${filePath} success`);
      child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
      resolve();
    });
  });
}

function saveType(options) {
  const {
    filePath,
    name,
    sourceStr
  } = options;
  logSuccess(`save ${filePath} start`);

  if (!sourceStr) {
    return Promise.reject();
  }

  return new Promise((resolve, reject) => {
    // console.log(interfaceStr);
    fs.writeFile(filePath, sourceStr, {}, err => {
      if (err) {
        logError(`${name}: save interface err`);
        logError(err);
        return;
      }

      child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
      logSuccess(`save ${filePath} success`);
      resolve();
    });
  });
}

module.exports = {
  saveReqParams,
  saveType,
  saveJSON
};