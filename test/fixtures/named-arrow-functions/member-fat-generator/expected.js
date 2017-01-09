x.fn = function* fn() {
  return yield 1;
}.bind(x);
