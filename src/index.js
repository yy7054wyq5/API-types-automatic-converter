// @flow
import { log, LogColors } from './log';

// @flow
function add(n: number): number {
	log(n, LogColors.bright);
	return n;
}

add(1111);
