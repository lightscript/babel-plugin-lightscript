async function fn() {
  return (async () => {
    try {
      return await fetch();
    } catch (_err) {
      return _err;
    }
  })();
}
