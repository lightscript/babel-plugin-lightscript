(() => {
  const _obj = {};

  for (let _arr = Array(3), i = 0, _len = _arr.length; i < _len; i++) {
    const x = g(i);

    _obj[i] = function g(x) {
      return x + 1;
    };
  }

  return _obj;
})();