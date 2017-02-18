c = [ for i from 0 til 10: if i > 5: i else: 0 ]
assert.deepEqual(c, [0, 0, 0, 0, 0, 0, 6, 7, 8, 9])
