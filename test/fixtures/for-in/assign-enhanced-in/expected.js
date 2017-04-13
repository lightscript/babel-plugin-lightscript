const _obj2 = _obj = complexFunction();

const _keys = Object.keys(_obj2),
      _len = _keys.length;

// _obj tests for scope uniqueness
for (let _i = 0; _i < _len; _i++) {
  const k = _keys[_i],
        v = _obj2[k];
}