c = [ for let i=0;i<3;i++: for let j=5;j<7;j++: [i, j] ]
assert.deepEqual(c, [ [0, 5], [0, 6], [1, 5], [1, 6], [2, 5], [2, 6] ])

d = [ for let i=0;i<3;i++: for let j=5;j<7;j++: if i > 1: [i, j] ]
assert.deepEqual(d, [ [2, 5], [2, 6] ])
