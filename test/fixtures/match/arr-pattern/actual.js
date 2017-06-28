match x:
  | with []:
    "empty"
  | with [ a, b ]:
    a - b
  | with [ a, b = 2 ]:
    a + b - 2
  | with [ a, ...b ]:
    b.concat(a)
  | with [
      [
        b
        d = 'e'
      ]
      [ g, , h ]
      ...j
  ]:
    [b, d, g, ...j].join('')
