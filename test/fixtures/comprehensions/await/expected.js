async function f() {
  return await Promise.all((async () => {
    const _arr = [];
    for (const x of arr) {
      _arr.push((await x));
    }
    return _arr;
  })());
}
