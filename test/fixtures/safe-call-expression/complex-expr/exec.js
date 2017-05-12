f(x) -> x
g() -> f
h = null

assert( (h?() ? g?() : f?(undefined))? === false )
