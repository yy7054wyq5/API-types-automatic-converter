import { log, LogColors } from './log';

function add(n) {
  log(n, LogColors.bright);
  return n;
}

add(1111);