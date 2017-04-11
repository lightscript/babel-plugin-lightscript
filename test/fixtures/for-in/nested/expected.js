for (let _i = 0, _len = arr1.length; _i < _len; _i++) {
  const i = arr1[_i];

  const _obj = objExpr2();

  for (const k in _obj) {
    if (!{}.hasOwnProperty.call(_obj, k)) continue;

    const _arr = arrExpr3();

    for (let j = 0, _len2 = _arr.length; j < _len2; j++) {
      for (const _k in obj4) {
        if (!{}.hasOwnProperty.call(obj4, _k)) continue;
        const l = obj4[_k];
        [i, j, k, l];
      }
    }
  }
}