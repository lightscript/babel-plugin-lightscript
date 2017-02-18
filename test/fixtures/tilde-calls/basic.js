f(...args) -> args
o = {
  a: 2
  m() => this
  g(x) -> x + 1
}

assert.deepEqual(1~f(), [1])
assert.deepEqual(1~f(3), [1, 3])
assert.deepEqual(1~f(3, 5, 6), [1, 3, 5, 6])
assert.equal(5~Math.pow(3), 125)
