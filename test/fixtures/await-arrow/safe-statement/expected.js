async function fn() {
  return await (async () => {
    try {
      return await fetch();
    } catch (_err) {
      return _err;
    }
  })();
}
