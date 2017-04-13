const _obj = slowRunningFunction();

const _keys = Object.keys(_obj),
      _len = _keys.length;

for (let _i = 0; _i < _len; _i++) {
  const k = _keys[_i],
        v = _obj[k];
  k;
}