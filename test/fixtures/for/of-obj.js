let y
for { x } of [{ x: 8 }, { x: 4 }]:
  y = x

assert.equal(y, 4)
