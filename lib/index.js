const {
  log,
  LogColors
} = require('./log');

function add(n) {
  log(n, LogColors.red);
  return n;
}

add(1111);