x = []
for key k in { one: 2, three: 4, five: 6 }: x.push(k)
assert.deepEqual(x, ["one", "three", "five"])
