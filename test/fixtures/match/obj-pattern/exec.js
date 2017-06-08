assert.equal(
  1,
  match { a: 1 }:
    | { a }:
      a
)
assert.equal(
  undefined,
  match { b: 1 }:
    | { a }:
      a
)
assert.equal(
  3,
  match { a: 1 }:
    | { a, b = 2 }:
      a + b
)
assert.equal(
  undefined,
  match { b: 1 }:
    | { a, b = 2 }:
      a + b
)
assert.equal(
  3,
  match { a: 1, b: { c: 2 } }:
    | { a, b: { c } }:
      a + c
)
assert.equal(
  undefined,
  match { a: 1 }:
    | { a, b: { c } }:
      a + c
)
