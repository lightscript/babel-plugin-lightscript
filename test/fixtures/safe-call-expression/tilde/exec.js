f(x) -> x
g() -> f
h = null

assert(g?()~f?() === f)
assert(g~h?() === null)
