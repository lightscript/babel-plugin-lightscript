(() => {
  const _arr = [];

  const _arr2 = Array(10);

  const _len = _arr2.length;

  for (let i = 0; i < _len; i++) {
    const _len2 = a.length;

    for (let j = 0; j < _len2; j++) {
      if (i < 5) {
        function f() {
          return (() => {
            const _obj = {};

            const _arr3 = Array(10);

            const _len3 = _arr3.length;

            for (let k = 0; k < _len3; k++) {
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