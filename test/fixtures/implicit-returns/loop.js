fn(x) ->
  for let i=0; i<10; i++:
    i

assert.equal(fn(), undefined);


for let i=0; i<1; i++:
  fn2() ->
    1
  assert.equal(fn2(), 1)
