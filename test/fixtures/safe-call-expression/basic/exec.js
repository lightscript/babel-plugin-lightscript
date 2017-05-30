f(x) -> x
g() -> f
h = null

assert( f?(true) )
assert( not(f?(false)) )
assert( g?()?(true) )
