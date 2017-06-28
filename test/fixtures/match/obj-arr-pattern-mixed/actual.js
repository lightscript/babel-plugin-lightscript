match x:
  | with { a, aa: [b, { c = 1 }, ...d] }:
    d.concat(a + b + c)
