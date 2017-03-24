c = [ for let i=0; i<10; i++: if i > 5: i else: 0 ]
assert.deepEqual(c, [0, 0, 0, 0, 0, 0, 6, 7, 8, 9])
