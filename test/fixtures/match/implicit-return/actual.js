f() ->
  match foo():
    | 1:
      "ok"
    | 2:
      bar()
      match baz():
        | 3:
          qux()
