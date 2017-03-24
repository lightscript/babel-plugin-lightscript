x = []
for elem e, idx i in [4, 5, 6]: x.push([i, e])
assert.deepEqual(x, [[0, 4], [1, 5], [2, 6]])
