const _obj2 = _obj = complexFunction();

// _obj tests for scope uniqueness
for (const k in _obj2) {
  if (!{}.hasOwnProperty.call(_obj2, k)) continue;
  const v = _obj2[k];
}