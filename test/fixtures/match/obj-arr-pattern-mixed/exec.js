m(x) -> match x:
  | with { a, aa: [b, { c = 1 }, ...d] }:
    d.concat(a + b + c)

assert.equal(
  undefined,
  m()
)
assert.equal(
  undefined,
  m({ a: 1 })
)
assert.equal(
  undefined,
  m({ a: 1, aa: [ 2 ] })
)
assert.deepEqual(
  [4],
  m({ a: 1, aa: [ 2, [ 3 ] ] })  // womp, arrays are objects
)
assert.deepEqual(
  [5],
  m({ a: 1, aa: [ 2, { c: 2 } ] })
)
assert.deepEqual(
  [7, 5],
  m({ a: 1, aa: [ 2, { c: 2 }, 7 ] })
)
