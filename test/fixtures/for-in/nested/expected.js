const _len = arr1.length;

for (let _i = 0; _i < _len; _i++) {
  const i = arr1[_i];

  const _obj = objExpr2();

  const _keys2 = Object.keys(_obj),
        _len2 = _keys2.length;

  for (let _i2 = 0; _i2 < _len2; _i2++) {
    const k = _keys2[_i2];

    const _arr = arrExpr3();

    const _len3 = _arr.length;

    for (let j = 0; j < _len3; j++) {
      const _keys4 = Object.keys(obj4),
            _len4 = _keys4.length;

      for (let _i3 = 0; _i3 < _len4; _i3++) {
        const _k = _keys4[_i3],
              l = obj4[_k];
        [i, j, k, l];
      }
    }
  }
}