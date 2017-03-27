[for idx i in Array(10):
  for idx j in a:
    if i < 5:
      f() ->
        {for idx k in Array(10):
          if k > 7:
            k, g() -> function h() { [i,j,k] }
        }
]
