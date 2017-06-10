function f() {
  const it = foo();

  if (it === 1) {
    return "ok";
  } else if (it === 2) {
    bar();
    {
      const it = baz();

      if (it === 3) {
        return qux();
      }
    }
  }
}