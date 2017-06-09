match x:
  | not 1 or not Number or not "hi":
    it
  | not x or not 1 + 1 or not foo(bar):
    it
