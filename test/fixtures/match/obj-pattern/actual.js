match x:
  | with { a }:
    a
  | with { a, b }:
    a + b
  | with { a, b = 1 }:
    a + b
  | with { a, b: { ba, bb = 1 }, c: { ca, cb: { cba } } }:
    a + ba + bb + ca + cba
  | 1 or 2 with { a, b: { c } }:
    a + c
  | with { a: { b: { c } } = otherObj }:
    c
  //TODO: test `| { a, ...b }: b`
