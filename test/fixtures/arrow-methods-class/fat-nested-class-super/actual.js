class A extends B {
  constructor() ->
    class C extends B:
      constructor() ->
        super()

  f() => this
}
