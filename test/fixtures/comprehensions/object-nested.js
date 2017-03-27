obj = { for idx i in Array(3): for idx j in Array(2): if i < 2: `${i}*${j}`, i*j }

assert.deepEqual(obj, {"0*0": 0, "0*1": 0, "1*0": 0, "1*1": 1})
