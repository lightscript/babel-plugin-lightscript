arr := [4, 5, 6]

let x, y
for i, e from arr:
  x = i
  y = e

assert.equal(x, 2)
assert.equal(y, 6)
