function f() {
  sideEffect0();

  for (let _obj = sideEffect1(), _i = 0, _keys = Object.keys(_obj), _len = _keys.length; _i < _len; _i++) {
    const k1 = _keys[_i];
    k1;
  }
}