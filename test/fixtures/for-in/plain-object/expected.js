const _obj = { one: 1, two: 2, three: 3 };

for (let _i = 0, _keys = Object.keys(_obj), _len = _keys.length; _i < _len; _i++) {
  const k = _keys[_i],
        v = _obj[k];
  k;
}