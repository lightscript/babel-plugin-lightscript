(() => {
  const _arr = [];

  for (let _arr2 = Array(10), i = 0, _len = _arr2.length; i < _len; i++) {
    function f() {
      return function g() {
        return i;
      };
    }

    _arr.push(f);
  }

  return _arr;
})();