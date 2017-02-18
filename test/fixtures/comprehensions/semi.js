arr = [4, 5, 6]

c = [ for let i = 0; i < arr.length; i++: [i, arr[i]] ]
assert.deepEqual(c, [[0, 4], [1, 5], [2, 6]])
