x = []
for key k, val v in { one: 2, three: 4, five: 6 }: x.push([k,v])
assert.deepEqual(x, [["one", 2], ["three", 4], ["five", 6]])
