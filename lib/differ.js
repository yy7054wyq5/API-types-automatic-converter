function differ(data, interfaceStr) {
  return data && data.indexOf('//') < 0 && // 没有斜杠注释
  data.indexOf('import {') < 0 && // 没有import关键字
  interfaceStr.replace(/ /g, '').length > data.toString().replace(/ /g, '').length // 新的类型定义长度大于原来的
  ? true : false;
}

module.exports = {
  differ
};