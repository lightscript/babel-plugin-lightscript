c = [ for let i=0; i<10; i++: if i > 5: i elif i > 3: i * 2 ]
assert.deepEqual(c, [8, 10, 6, 7, 8, 9])
