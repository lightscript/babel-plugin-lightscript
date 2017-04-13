function f() {
  sideEffect0();

  const _arr = sideEffect1();

  const _len = _arr.length;

  for (let _i = 0; _i < _len; _i++) {
    const k1 = _arr[_i];
    k1;
  }
}