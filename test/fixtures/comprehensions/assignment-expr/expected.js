(() => {
  const _arr = [];

  const _arr2 = Array(10);

  const _len = _arr2.length;

  for (let i = 0; i < _len; i++) {
    x = f(i);

    _arr.push(x)
  }

  return _arr;
})();