arr1 = [0,1]
objExpr2() -> ({ key: "key" })
arrExpr3() -> [2,3]
obj4 = { key1: "value1", key2: "value2" }

result = [for elem i in arr1: for key k in objExpr2(): for idx j in arrExpr3(): for val l in obj4: [i,j,k,l]]

assert.deepEqual(result, [
  [0, 0, "key", "value1"],
  [0, 0, "key", "value2"],
  [0, 1, "key", "value1"],
  [0, 1, "key", "value2"],
  [1, 0, "key", "value1"],
  [1, 0, "key", "value2"],
  [1, 1, "key", "value1"],
  [1, 1, "key", "value2"]
])
