x = []
for val v in { one: 2, three: 4, five: 6 }: x.push(v)
assert.deepEqual(x, [2, 4, 6])
