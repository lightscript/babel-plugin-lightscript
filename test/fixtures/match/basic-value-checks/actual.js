match x:
  | 1: "lt one"
  | "hi": "eq zero"
  | `there ${1 + 1}`: "eq two"
  | ~f(): "f(x) truthy"
  | .prop: "has prop"
  | .0: "has first child"
