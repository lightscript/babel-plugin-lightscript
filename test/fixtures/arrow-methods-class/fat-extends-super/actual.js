class A extends B {
  constructor() ->
    foo()
    super()
    bar()

  // don't be ugly, output!
  f() => this
}
