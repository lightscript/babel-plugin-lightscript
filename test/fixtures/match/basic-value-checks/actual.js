match x:
  | 1 or 0.1 or 0x11 or +1 or -1:
    it
  | "hi":
    it
  | `there ${1 + 1}`:
    it
  | /\s+/:
    it
  | Number or Boolean or String:
    it
  | Array or Object or Map or Foo:
    it
  | null or undefined:
    it
  | x or +x:
    it
  | not 1 or not x:
    it
