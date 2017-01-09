class A extends B {
  constructor() ->
    if false:
      super()
      foo()
    else:
      super()
      bar()

  f() => this
}
