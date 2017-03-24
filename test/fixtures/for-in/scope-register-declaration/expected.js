function f() {
  const _obj = g();

  for (const k in _obj) {
    if (!_obj.hasOwnProperty(k)) continue;
    k;
  }

  const _obj2 = g();

  for (const k in _obj2) {
    if (!_obj2.hasOwnProperty(k)) continue;
    k;
  }
}