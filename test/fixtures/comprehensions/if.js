c := [ for i from 0 til 10: if i > 5: i ]
assert.deepEqual(c, [6, 7, 8, 9])
