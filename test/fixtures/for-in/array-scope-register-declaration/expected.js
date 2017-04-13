function f() {
  const _arr = g();

  const _len = _arr.length;

  for (let _i = 0; _i < _len; _i++) {
    const k = _arr[_i];
    k;
  }

  const _arr2 = g();

  const _len2 = _arr2.length;

  for (let _i2 = 0; _i2 < _len2; _i2++) {
    const k = _arr2[_i2];
    k;
  }
}