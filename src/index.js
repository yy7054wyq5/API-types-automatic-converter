const { log, LogColors } = require('./log');

// @flow
function add(n: number): number {
  log(n, LogColors.red);
  return n;
}

add(1111);
