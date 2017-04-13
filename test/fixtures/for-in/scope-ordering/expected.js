function f() {
  sideEffect0();

  const _obj = sideEffect1();

  const _keys = Object.keys(_obj),
        _len = _keys.length;

  for (let _i = 0; _i < _len; _i++) {
    const k1 = _keys[_i];
    k1;
  }
}