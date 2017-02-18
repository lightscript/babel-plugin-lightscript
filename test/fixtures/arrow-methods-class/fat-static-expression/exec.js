x(klass) ->
  f = klass.f
  f()

name = x(
  class A:
    static f() =>
      this.name
);

assert.equal(name, "A");
