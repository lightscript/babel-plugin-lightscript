async function fn() {
  const x = await Promise.all([p1, p2]);
  const y = await Promise.all([p1, p2]);
  return Promise.all((() => {
    const _arr = [];
    for (const p of ps) _arr.push(p);return _arr;
  })());
}
