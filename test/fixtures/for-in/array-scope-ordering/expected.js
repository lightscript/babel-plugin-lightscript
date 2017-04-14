function f() {
  sideEffect0();

  for (let _arr = sideEffect1(), _i = 0, _len = _arr.length; _i < _len; _i++) {
    const k1 = _arr[_i];
    k1;
  }
}