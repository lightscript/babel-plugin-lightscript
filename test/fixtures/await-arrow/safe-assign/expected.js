async function fn() {
  const x = (async () => {
    try {
      return await fetch();
    } catch (_err) {
      return _err;
    }
  })();
  return x + 1;
}
