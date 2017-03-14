arr = [4, 5, 6]

f() ->
  c = [ for x of arr:
    if x == 4: return
    x
  ]
