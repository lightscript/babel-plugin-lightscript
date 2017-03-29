const _obj = slowRunningFunction();
for (const k in _obj) {
  if (!_obj.hasOwnProperty(k)) continue;
  const v = _obj[k];
  k;
}
