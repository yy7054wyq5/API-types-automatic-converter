const json2ts = require('json-to-ts');

const {
  logError
} = require('./log');

function putInterfaceName(sourceStr, interfaceName) {
  let editedStr = sourceStr;
  editedStr = editedStr.replace(/ any/g, 'unknown');
  return editedStr.replace(/interface RootObject/, `export interface ${interfaceName}`); // 重写接口
}

function json2Interface(data, interfaceName) {
  try {
    const str = json2ts.default(data).toString().replace(/,/g, ' ');
    return putInterfaceName(str, interfaceName);
  } catch (error) {
    logError('json2Interface.js json2Interface error');
    logError(error);
    return '';
  }
}

module.exports = {
  json2Interface
};