closures = [for idx i in Array(3):
  x = g(i)
  g(x) -> x+i
]
results = [for elem f in closures: f(1)]

assert.deepEqual(results, [1,2,3])
