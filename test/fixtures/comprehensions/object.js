obj = {for elem e in [1,2,3]: e, 2*e}

assert.deepEqual(obj, { "1": 2, "2": 4, "3": 6})
