import { looseEq, looseNotEq } from 'babel-plugin-lightscript/stdlib';import { map, round } from 'lodash';looseEq(1, '1');
looseNotEq(1, '1');
foo(1, '1');
function uniq(x) {
  return x;
}
uniq(map([.1, .2, .5, .9], round));