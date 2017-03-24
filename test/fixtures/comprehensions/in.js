arr = [4, 5, 6]

x = [ for const i in arr: parseInt(i) ]
assert.deepEqual(x, [0, 1, 2])

y = [ for const i in arr: parseInt(i) + 1 ]
assert.deepEqual(y, [1, 2, 3])
