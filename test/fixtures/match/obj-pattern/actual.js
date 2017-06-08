match x:
  | { a }:
    a
  | { a, b }:
    a + b
  | { a, b = 1 }:
    a + b
  | { a, b: { ba, bb = 1 }, c: { ca, cb: { cba } } }:
    a + ba + bb + ca + cba
  | 1 or 2 with { a, b: { c } }:
    a + c
  | { a: { b: { c } } = otherObj }:
    c
  //TODO: | { a, ...b }: b
