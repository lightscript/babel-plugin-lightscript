const _obj = { one: 1, two: 2, three: 3 };

for (const k in _obj) {
  if (!_obj.hasOwnProperty(k)) continue;
  const v = _obj[k];
  k;
}