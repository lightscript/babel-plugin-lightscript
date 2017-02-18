f(...args) -> args
o = {
  a: 2
  m() => this
  g(x) -> x + 1
}

assert.equal(1~o.g(), 2)
assert.equal(1~o["g"](), 2)
assert.deepEqual(
  o.m().a
    ~o.g()
    .toString()
    ~f()
, ["3"])
