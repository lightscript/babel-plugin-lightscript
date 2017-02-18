c = [ for i from 0 til 10: if i > 5: i else if i > 3: i * 2 ]
assert.deepEqual(c, [8, 10, 6, 7, 8, 9])
