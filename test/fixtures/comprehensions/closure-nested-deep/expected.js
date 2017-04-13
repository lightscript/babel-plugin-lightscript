(() => {
  const _arr = [];

  const _arr2 = Array(10);

  for (let i = 0, _len = _arr2.length; i < _len; i++) {
    for (let j = 0, _len2 = a.length; j < _len2; j++) {
      if (i < 5) {
        function f() {
          return (() => {
            const _obj = {};

            const _arr3 = Array(10);

            for (let k = 0, _len3 = _arr3.length; k < _len3; k++) {
              if (k > 7) {
                _obj[k] = function g() {
                  return function h() {
                    return [i, j, k];
                  };
                };
              }
            }

            return _obj;
          })();
        }

        _arr.push(f);
      }
    }
  }

  return _arr;
})();