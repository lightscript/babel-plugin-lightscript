import map from 'lodash/map';
import round from 'lodash/round';

function looseEq(a, b) {
  return a == b;
}

function looseNotEq(a, b) {
  return a != b;
}

looseEq(1, '1');
looseNotEq(1, '1');
foo(1, '1');

function uniq(x) {
  return x;
}

uniq(map([0.1, 0.2, 0.5, 0.9], round));