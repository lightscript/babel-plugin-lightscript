async function fn() {
  const x = await (async () => {
    try {
      return await fetch();
    } catch (_err) {
      return _err;
    }
  })();return x + 1;
}