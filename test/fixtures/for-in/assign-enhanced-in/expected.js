// _obj tests for scope uniqueness
for (let _obj2 = _obj = complexFunction(), _i = 0, _keys = Object.keys(_obj2), _len = _keys.length; _i < _len; _i++) {
  const k = _keys[_i];
  const v = _obj2[k];
}