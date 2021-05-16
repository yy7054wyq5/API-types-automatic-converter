const fs = require('fs');

const child_process = require('child_process');

const {
  logSuccess,
  logError
} = require('./log');

const {
  differ
} = require('./differ');

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
    fs.readFile(filePath, {}, (err, data) => {
      const interfaceStr = sourceStr;
      let diff = data && differ(data.toString(), interfaceStr);

      if (err || !data || diff) {
        logSuccess(`save ${filePath} end`);
        console.log(interfaceStr);
        fs.writeFile(filePath, interfaceStr, {}, err => {
          if (err) {
            logError(`${name}: save interface err`);
            logError(err);
            return;
          }

          child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
          logSuccess(`update ${filePath} success`);
          resolve();
        });
        return;
      }

      logSuccess(`save ${filePath} end: no update`);
    });
  });
}

module.exports = {
  saveType
};