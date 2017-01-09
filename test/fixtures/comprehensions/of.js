arr := [4, 5, 6]

x := [ for x of arr: x ]
assert.deepEqual(x, [4, 5, 6])

y := [ for y of arr: y + 1 ]
assert.deepEqual(y, [5, 6, 7])
