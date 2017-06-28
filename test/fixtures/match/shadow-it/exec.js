it = "good"
f() ->
  match "bad":
    | true: true

  it

assert.equal("good", f())
