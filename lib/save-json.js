const fs = require('fs');

const child_process = require('child_process');

const {
  logSuccess
} = require('./log');

function saveJSON(filePath, content) {
  logSuccess(`save JSON ${filePath} start`);
  fs.writeFile(filePath, content, {}, err => {
    child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
    logSuccess(`update ${filePath} success`);
  });
}

module.exports = {
  saveJSON
};