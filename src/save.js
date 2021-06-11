// @flow

const { json2Interface } = require('./converter');
const { logError, logSuccess, log, LogColors } = require('./log');
const { differ } = require('./differ');
const innerDiffer = differ;
const fs = require('fs');
const child_process = require('child_process');
import type { UpdateStrategy } from './init';

function saveJSON(filePath: string, content: string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, content, {}, (err) => {
			child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
			resolve();
		});
	});
}

function saveType(options: { filePath: string, content: string }): Promise<void> {
	const { filePath, content } = options;
	if (!content) {
		return Promise.reject();
	}
	return new Promise((resolve, reject) => {
		// console.log(interfaceStr);
		fs.writeFile(filePath, content, {}, (err) => {
			if (err) {
				logError(`${filePath}: save interface err`);
				logError(err);
				return;
			}
			child_process.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
			logSuccess(`save ${filePath} success`);
			resolve();
		});
	});
}

module.exports = { saveType, saveJSON };
