c = [ for let i=0; i<10; i++: if i > 5: i ]
assert.deepEqual(c, [6, 7, 8, 9])
