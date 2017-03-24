let y
for const [ x ] of [ [1], [4, 0] ]:
  now y = x

assert.equal(y, 4)
