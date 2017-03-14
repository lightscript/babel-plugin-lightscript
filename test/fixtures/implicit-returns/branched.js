f(x) ->
  if (false) {
    1
  } else {
    2
    3
  }

assert.equal(f(), 3)


g() ->
  if false:
    2
  else if false:
    3
  else if true:
    4
  else:
    5

assert.equal(g(), 4)
