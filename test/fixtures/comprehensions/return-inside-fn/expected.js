function f() {
  const c = (() => {
    const _arr = [];
    for (const x of arr) {
      function g() {
        return x;
      }

      _arr.push(g);
    }return _arr;
  })();
  return c;
}