fn(x) ->
  for i from 0 til 10:
    i

assert.equal(fn(), undefined);


for i from 0 til 1:
  fn2() ->
    1
  assert.equal(fn2(), 1)
