const _obj = slowRunningFunction();

for (const k in _obj) {
  if (!{}.hasOwnProperty.call(_obj, k)) continue;
  const v = _obj[k];
  k;
}