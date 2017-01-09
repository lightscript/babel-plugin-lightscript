c := [ for i from 0 til 3: for j from 5 til 7: [i, j] ]
assert.deepEqual(c, [ [0, 5], [0, 6], [1, 5], [1, 6], [2, 5], [2, 6] ])

d := [ for i from 0 til 3: for j from 5 til 7: if i > 1: [i, j] ]
assert.deepEqual(d, [ [2, 5], [2, 6] ])
