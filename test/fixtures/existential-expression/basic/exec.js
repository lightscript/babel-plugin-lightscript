x = 3
assert(x?)

y = null
assert(not y?)

z = undefined
assert(!z?)

f = -> undefined
assert(not f()?)

a = 0
assert(a?)

b = -> ''
assert(b()?)
