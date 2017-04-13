(() => {
  const _obj = {};
  const _len = arr.length;

  for (let _i = 0; _i < _len; _i++) {
    const x = arr[_i];
    _obj[x] = f(x);
  }

  return _obj;
})();