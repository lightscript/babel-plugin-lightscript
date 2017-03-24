let y
for const { x } of [{ x: 8 }, { x: 4 }]:
  now y = x

assert.equal(y, 4)
