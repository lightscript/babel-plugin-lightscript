assert.equal(
  "empty",
  match []:
    | []:
      "empty"
)
assert.equal(
  "empty",
  match []:
    | []:
      "empty"
)
assert.equal(
  undefined,
  match []:
    | [a]:
      a + 1
)
assert.equal(
  undefined,
  match [1]:
    | [a, b]:
      a + b
)
assert.equal(
  5,
  match [1]:
    | [a, b = 4]:
      a + b
)
assert.equal(
  3,
  match [1, 2]:
    | [a, b]:
      a + b
)
assert.equal(
  4,
  match [1, 2, 3]:
    | [a,, b]:
      a + b
)
assert.equal(
  undefined,
  match [1, 2]:
    | [a,, b]:
      a + b
)
assert.deepEqual(
  [2, 3, 1],
  match [1, 2, 3]:
    | [a, ...b]:
      b.concat(a)
)
assert.deepEqual(
  [1, 4],
  match [4]:
    | [a, b = 1, ...c]:
      c.concat([b, a])
)
assert.deepEqual(
  [6, 7, 5, 4],
  match [4, 5, 6, 7]:
    | [a, b = 1, ...c]:
      c.concat([b, a])
)
assert.deepEqual(
  [1, 2, 4, 6, 7, 8],
  match [[1], [4, 5, 6], 7, 8]:
    | [
        [
          b
          d = 2
        ]
        [ g, , h ]
        ...j
    ]:
      [b, d, g, h, ...j]
)
assert.deepEqual(
  undefined,
  match [[1], [4, 5], 7, 8]:
    | [
        [
          b
          d = 2
        ]
        [ g, , h ]
        ...j
    ]:
      [b, d, g, h, ...j]
)
