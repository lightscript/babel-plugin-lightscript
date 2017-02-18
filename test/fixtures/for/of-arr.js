let y
for [ x ] of [ [1], [4, 0] ]:
  now y = x

assert.equal(y, 4)
