export interface DifferParams {
	data: unknown;
	oldData: unknown | null;
	typeContent: string;
	oldTypeContent: string | null;
	schema?: unknown;
}

export type Differ = (params: DifferParams) => boolean;

function differ(params: DifferParams): boolean {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Ajv = require('ajv');
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { data, oldData, typeContent, oldTypeContent, schema } = params;
	const ajv = new Ajv();
	if (schema && data) {
		const validate = ajv.compile(schema);
		const valid = validate(data);
		if (valid) {
			return false;
		}
	}

	return true;
}

export { differ };
