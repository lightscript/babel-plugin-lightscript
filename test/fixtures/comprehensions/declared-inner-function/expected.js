const closures = (() => {
  const _arr = [];

  for (let _arr2 = Array(3), i = 0, _len = _arr2.length; i < _len; i++) {
    const x = g(i);

    function g(x) {
      return x + 1;
    }

    _arr.push(g);
  }

  return _arr;
})();