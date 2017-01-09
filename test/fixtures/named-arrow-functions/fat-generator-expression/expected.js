const x = function* fn() {
  yield 1;
  return yield 2;
}.bind(this);
