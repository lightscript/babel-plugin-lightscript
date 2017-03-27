closures = [for idx i in Array(3):
  x = g(i)
  g(x) -> x+1
]
