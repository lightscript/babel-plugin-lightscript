function f() {
  for (let _arr = g(), _i = 0, _len = _arr.length; _i < _len; _i++) {
    const k = _arr[_i];
    k;
  }

  for (let _arr2 = g(), _i2 = 0, _len2 = _arr2.length; _i2 < _len2; _i2++) {
    const k = _arr2[_i2];
    k;
  }
}