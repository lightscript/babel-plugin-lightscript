(() => {
  const _arr = [];

  const _arr2 = Array(10);

  for (let i = 0, _len = _arr2.length; i < _len; i++) {
    function f() {
      return i;
    }

    _arr.push(f);
  }

  return _arr;
})();