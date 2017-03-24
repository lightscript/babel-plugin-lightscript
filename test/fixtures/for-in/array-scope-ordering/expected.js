function f() {
  sideEffect0();

  const _arr = sideEffect1();

  for (let _i = 0, _len = _arr.length; _i < _len; _i++) {
    const k1 = _arr[_i];
    k1;
  }
}