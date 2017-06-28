match foo():
  | 1:
    match it:
      | 2: it
  | with { x }:
    match x:
      | 2: it
