(() => {
  const _obj = {};

  const _arr = Array(3);

  for (let i = 0, _len = _arr.length; i < _len; i++) {
    const x = g(i);

    _obj[i] = function g(x) {
      return x + 1;
    };
  }

  return _obj;
})();