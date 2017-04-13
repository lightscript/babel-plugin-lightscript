(() => {
  const _obj = {};

  const _arr = Array(3);

  const _len = _arr.length;

  for (let i = 0; i < _len; i++) {
    const x = g(i);

    _obj[i] = function g(x) {
      return x + 1;
    };
  }

  return _obj;
})();