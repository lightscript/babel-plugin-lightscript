let x = 0
result = [for idx i in Array(10):
  now x = i
]
assert.deepEqual(result, [0,1,2,3,4,5,6,7,8,9])
assert(x === 9)
