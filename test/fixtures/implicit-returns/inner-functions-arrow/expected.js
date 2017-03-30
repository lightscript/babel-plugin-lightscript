function fn() {
  const value = 42;

  function inner() {
    return value;
  }
  return inner;
}
