async function fn() {
  const x = (async () => {
    try {
      return await fetch();
    } catch (_err2) {
      return _err2;
    }
  })();

  return x + 1;
}
