// function differ(data: string, interfaceStr: string): boolean {
// 	return data &&
// 		data.indexOf('//') < 0 && // 没有斜杠注释
// 		data.indexOf('import {') < 0 && // 没有import关键字
// 		interfaceStr.replace(/ /g, '').length > data.toString().replace(/ /g, '').length // 新的类型定义长度大于原来的
// 		? true
// 		: false;
// }
const Ajv = require('ajv');

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
  differ
};