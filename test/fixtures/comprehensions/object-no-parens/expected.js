(() => {
  const _obj = {};

  for (let _i = 0, _len = arr.length; _i < _len; _i++) {
    const x = arr[_i];
    _obj[x] = f(x);
  }

  return _obj;
})();