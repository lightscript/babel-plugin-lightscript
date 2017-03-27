const closures = (() => {
  const _arr = [];

  const _arr2 = Array(3);

  for (let i = 0, _len = _arr2.length; i < _len; i++) {
    const x = g(i);

    function g(x) {
      return x + 1;
    }

    _arr.push(g);
  }

  return _arr;
})();