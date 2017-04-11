function f() {
  sideEffect0();

  const _obj = sideEffect1();

  for (const k1 in _obj) {
    if (!{}.hasOwnProperty.call(_obj, k1)) continue;
    k1;
  }
}