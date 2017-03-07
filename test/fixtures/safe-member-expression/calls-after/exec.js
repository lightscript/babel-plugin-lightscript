a = {
  b() -> 1
}
assert.equal(a?.b(), 1)

c = null
assert.equal(c?.b(), null)

// use if blocks for variable name reuse
if (true) {
  g() -> 1
  f() ->
    { g }
  e() ->
    { f }
  d = { e }
  assert.equal(d?.e()?.f().g(), 1)
}

if (true) {
  e() ->
    null
  d = { e }
  assert.equal(d?.e()?.f().g(), null)
}

if (true) {
  d = null
  assert.equal(d?.e()?.f().g(), null)
}
