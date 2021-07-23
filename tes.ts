import * as fs from 'fs';
import { ConfigPath } from './src/init';

const extensionNames = ['.ts', '.js'];
let content: Buffer;
for (const name of extensionNames) {
	try {
		content = fs.readFileSync(ConfigPath + name);
	} catch (error) {
		// nothing
	}
}
console.log(content.toString());
