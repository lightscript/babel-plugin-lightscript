function f() {
  const _obj = g();

  const _keys = Object.keys(_obj),
        _len = _keys.length;

  for (let _i = 0; _i < _len; _i++) {
    const k = _keys[_i];
    k;
  }

  const _obj2 = g();

  const _keys2 = Object.keys(_obj2),
        _len2 = _keys2.length;

  for (let _i2 = 0; _i2 < _len2; _i2++) {
    const k = _keys2[_i2];
    k;
  }
}