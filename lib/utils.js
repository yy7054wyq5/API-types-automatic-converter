function firstUpperCase(str) {
  const [first, ...rest] = str.split('');
  return first.toUpperCase() + rest.join('');
}

function getQueryParamsFromUrl(url) {
  const paramsIndex = url.indexOf('?');

  if (paramsIndex < 1) {
    return {};
  }

  const str = url.substring(paramsIndex + 1, url.length);
  const arr = str.split('&');
  const tmp = {};
  arr.map(item => {
    const [key, value] = item.split('=');
    tmp[key] = value;
  });
  return tmp;
}

function line2Hump(str) {
  if (!str) {
    return '';
  }

  var strArr = str.split('');
  var hasLine = str.indexOf('-') > -1; // console.log(hasLine);

  for (var index = 0; index < strArr.length; index++) {
    var element = strArr[index];

    if (element === '-') {
      // console.log(element);
      strArr[index + 1] = strArr[index + 1].toUpperCase();
    } else if (/^[A-Z]/.test(element) && !hasLine) {
      strArr[index] = '-' + element.toLowerCase();
    }
  }

  if (hasLine) {
    return strArr.join('').replace(/-/g, '');
  }

  return strArr.join('');
}

module.exports = {
  line2Hump,
  getQueryParamsFromUrl,
  firstUpperCase
}; // console.log(getQueryParamsFromUrl('djada?a=2&djjajda=djadjas'));