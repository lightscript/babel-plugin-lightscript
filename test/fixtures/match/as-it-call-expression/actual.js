z = match foo.bar():
  | it < 1: "lt one"
  | it + 1 == 1: "eq zero"
  | it == 2: "eq two"
  | it~f(): "f(x) truthy"
  | it.prop: "has prop"
  | it.0: "has first child"
