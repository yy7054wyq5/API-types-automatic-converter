declare module 'node-http-proxy-json' {
	import * as http from 'http';
	function modifyResponse(res: http.ServerResponse, proxyRes: http.IncomingMessage, cb: (body: unknown) => void): void;
	export = modifyResponse;
}
