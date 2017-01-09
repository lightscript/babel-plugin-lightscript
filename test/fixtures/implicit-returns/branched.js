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


h() ->
  for i from 0 til 5:
    if i < 3:
      for j from 0 til 3:
        if j > 1:
          i + j

assert.equal(h(), 4)
