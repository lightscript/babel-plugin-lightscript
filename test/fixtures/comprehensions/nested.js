c = [ for let i=0; i<4; i++: [ for let i=0; i<3; i++: 2 ] ]
assert.deepEqual(c, [ [2, 2, 2], [2, 2, 2], [2, 2, 2], [2, 2, 2] ])
