arr = [4, 5, 6]

c = [ for idx i, elem x in arr: [i, x] ]
assert.deepEqual(c, [[0, 4], [1, 5], [2, 6]])
