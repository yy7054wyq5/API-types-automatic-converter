import { json2Interface } from './converter';
import { getFileContent } from './utils';
import type { Differ } from './differ';
import { log, LogColors } from './log';
import type { UpdateStrategy } from './init';
import * as fs from 'fs';

export const Latest = 'Latest';

function hasLatestContent(typeContent: string, typeFilePath: string): boolean {
	// 已有的内容有 Latest
	if (typeContent && typeContent.indexOf(Latest) > -1) {
		log('latest: ' + typeFilePath, LogColors.cyanBG);
		return true;
	}
	return false;
}

function beforeUpdate(data: unknown, oldTypeContent: string, typeFilePath: string): boolean {
	if (hasLatestContent(oldTypeContent, typeFilePath)) {
		return false;
	}
	return true;
}

export function getReqParamsTypeContent(options: {
	differ: Differ;
	data: unknown;
	typeName: string;
	typeFilePath: string;
	updateStrategy: UpdateStrategy;
}): string | null {
	const { typeFilePath, data, typeName, differ, updateStrategy } = options;
	const { type: oldTypeContent } = getFileContent(typeFilePath);

	const typeContent = json2Interface(data, typeName);
	if (!oldTypeContent) {
		return typeContent;
	}

	if (!beforeUpdate(data, oldTypeContent, typeFilePath)) {
		return null;
	}

	const canUpdate = differ({
		data,
		oldData: null,
		typeContent,
		oldTypeContent,
	});
	if (!canUpdate) {
		log(`${typeFilePath} not update`, LogColors.blue);
		return null;
	}
	let updateContent = typeContent;
	if (updateStrategy === 'append') {
		updateContent = `${oldTypeContent || ''} ${json2Interface(data, typeName + Latest)}`;
		log('update: ' + typeFilePath, LogColors.cyanBG);
	}
	return updateContent;
}

function creatTmpTSFile(filePath: string, content: string): string {
	const newContentFilePath = filePath.split('.ts')[0] + '.tmp' + '.ts';
	if (content) {
		fs.writeFileSync(newContentFilePath, content);
	}
	return newContentFilePath;
}

export function getResBodyTypeContent(options: {
	differ: Differ;
	body: unknown;
	typeName: string;
	typeFilePath: string;
	jsonFilePath: string;
	schemaFilePath: string;
	updateStrategy: UpdateStrategy;
}): null | { updateContent: string; latestTypeContentFilePath: string | null } {
	const { typeFilePath, jsonFilePath, schemaFilePath, body, typeName, differ, updateStrategy } = options;
	const { json, schema, type: oldTypeContent } = getFileContent(typeFilePath, jsonFilePath, schemaFilePath);

	const typeContent = json2Interface(body, typeName);
	if (!oldTypeContent) {
		return {
			updateContent: typeContent,
			latestTypeContentFilePath: null,
		};
	}

	if (!beforeUpdate(body, oldTypeContent, typeFilePath)) {
		return null;
	}

	const canUpdate = differ({
		data: body,
		oldData: json,
		typeContent,
		oldTypeContent,
		schema,
	});
	if (!canUpdate) {
		log(`${typeFilePath} not update`, LogColors.blue);
		return null;
	}
	let updateContent = typeContent;
	let latestTypeContentFilePath = null;
	if (updateStrategy === 'append') {
		updateContent = `${oldTypeContent || ''} ${json2Interface(body, typeName + Latest)}`;
		latestTypeContentFilePath = creatTmpTSFile(typeFilePath, typeContent);
		log('update: ' + typeFilePath, LogColors.cyanBG);
	}

	return {
		updateContent,
		latestTypeContentFilePath,
	};
}
