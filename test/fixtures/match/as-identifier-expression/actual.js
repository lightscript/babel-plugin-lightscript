z = match x as y:
  | y < 1: "lt one"
  | y + 1 == 1: "eq zero"
  | y == 2: "eq two"
  | y~f(): "f(x) truthy"
  | y.prop: "has prop"
  | y.0: "has first child"
