import { looseEq, looseNotEq } from 'babel-plugin-lightscript/stdlib';
import { map, round } from 'lodash';
looseEq(1, '1');
looseNotEq(1, '1');
foo(1, '1');

function uniq(x) {
  return x;
}

uniq(map([0.1, 0.2, 0.5, 0.9], round));
