function looseEq(a, b) {
  return a == b;
}

function looseNotEq(a, b) {
  return a != b;
}

const map = require('lodash/map');

const round = require('lodash/round');

looseEq(1, '1');
looseNotEq(1, '1');
foo(1, '1');

function uniq(x) {
  return x;
}

uniq(map([0.1, 0.2, 0.5, 0.9], round));