function f() {
  const _obj = g();

  for (const k in _obj) {
    if (!{}.hasOwnProperty.call(_obj, k)) continue;
    k;
  }

  const _obj2 = g();

  for (const k in _obj2) {
    if (!{}.hasOwnProperty.call(_obj2, k)) continue;
    k;
  }
}