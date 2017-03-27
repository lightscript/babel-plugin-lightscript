obj = {for idx i in Array(10): if i > 8: (i, i)}

assert.deepEqual(obj, { "9": 9 })
