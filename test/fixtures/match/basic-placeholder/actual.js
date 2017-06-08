match x:
  | < 1: "lt one"
  | + 1 == 1: "eq zero"
  | == 2: "eq two"
  | ~f(): "f(x) truthy"
  | .prop: "has prop"
  | .0: "has first child"
