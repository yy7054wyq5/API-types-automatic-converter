import { logError, logSuccess } from './log';
import * as fs from 'fs';
import * as childProcess from 'child_process';

function saveJSON(filePath: string, content: string): Promise<void> {
	return new Promise((resolve) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		fs.writeFile(filePath, content, {}, (err) => {
			childProcess.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
			resolve();
		});
	});
}

function saveType(options: { filePath: string; content: string }): Promise<void> {
	const { filePath, content } = options;
	if (!content) {
		return Promise.reject();
	}
	return new Promise((resolve) => {
		// console.log(interfaceStr);
		fs.writeFile(filePath, content, {}, (err) => {
			if (err) {
				logError(`${filePath}: save interface err`);
				logError(err);
				return;
			}
			childProcess.exec(`prettier --config ./.prettierrc.json --write ${filePath}`);
			logSuccess(`save ${filePath} success`);
			resolve();
		});
	});
}

export { saveType, saveJSON };
