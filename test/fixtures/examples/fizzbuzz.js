
fizzBuzz(n = 100) ->
  arr := []
  for i from 1 til n+1:
    x :=
      if i % 3 == 0 and i % 5 == 0:
        "fizzbuzz"
      elif i % 3 == 0:
        "fizz"
      elif i % 5 == 0:
        "buzz"
      else:
        i
    arr.push(x)
  arr

fizzBuzzComp(n = 100) ->
  [for i from 1 til n+1:
    if i % 3 == 0 and i % 5 == 0:
      "fizzbuzz"
    elif i % 3 == 0:
      "fizz"
    elif i % 5 == 0:
      "buzz"
    else:
      i
  ]

fizzBuzzMap(n = 100) ->
  Array(n+1).fill(0)
    .map((x, i) -> i)
    .filter(x -> x != 0)
    .map(x ->
      if x % 3 == 0 and x % 5 == 0:
        "fizzbuzz"
      elif x % 3 == 0:
        "fizz"
      elif x % 5 == 0:
        "buzz"
      else:
        x
    )

fizzBuzzMap2(n = 100) ->
  [for x from 1 til n+1: x].map(x ->
    if x % 3 == 0 and x % 5 == 0: "fizzbuzz"
    elif x % 3 == 0: "fizz"
    elif x % 5 == 0: "buzz"
    else: x
  )

fizzBuzzGen(n = 100) -*>
  for i from 1 til n+1:
    if i % 3 == 0 and i % 5 == 0:
      yield "fizzbuzz"
    elif i % 3 == 0:
      yield "fizz"
    elif i % 5 == 0:
      yield "buzz"
    else:
      yield i

assert.deepEqual(fizzBuzz(), [1, 2, "fizz", 4, "buzz", "fizz", 7, 8, "fizz", "buzz", 11, "fizz", 13, 14, "fizzbuzz", 16, 17, "fizz", 19, "buzz", "fizz", 22, 23, "fizz", "buzz", 26, "fizz", 28, 29, "fizzbuzz", 31, 32, "fizz", 34, "buzz", "fizz", 37, 38, "fizz", "buzz", 41, "fizz", 43, 44, "fizzbuzz", 46, 47, "fizz", 49, "buzz", "fizz", 52, 53, "fizz", "buzz", 56, "fizz", 58, 59, "fizzbuzz", 61, 62, "fizz", 64, "buzz", "fizz", 67, 68, "fizz", "buzz", 71, "fizz", 73, 74, "fizzbuzz", 76, 77, "fizz", 79, "buzz", "fizz", 82, 83, "fizz", "buzz", 86, "fizz", 88, 89, "fizzbuzz", 91, 92, "fizz", 94, "buzz", "fizz", 97, 98, "fizz", "buzz"]);
assert.deepEqual(fizzBuzzComp(), [1, 2, "fizz", 4, "buzz", "fizz", 7, 8, "fizz", "buzz", 11, "fizz", 13, 14, "fizzbuzz", 16, 17, "fizz", 19, "buzz", "fizz", 22, 23, "fizz", "buzz", 26, "fizz", 28, 29, "fizzbuzz", 31, 32, "fizz", 34, "buzz", "fizz", 37, 38, "fizz", "buzz", 41, "fizz", 43, 44, "fizzbuzz", 46, 47, "fizz", 49, "buzz", "fizz", 52, 53, "fizz", "buzz", 56, "fizz", 58, 59, "fizzbuzz", 61, 62, "fizz", 64, "buzz", "fizz", 67, 68, "fizz", "buzz", 71, "fizz", 73, 74, "fizzbuzz", 76, 77, "fizz", 79, "buzz", "fizz", 82, 83, "fizz", "buzz", 86, "fizz", 88, 89, "fizzbuzz", 91, 92, "fizz", 94, "buzz", "fizz", 97, 98, "fizz", "buzz"]);
assert.deepEqual(fizzBuzzMap(), [1, 2, "fizz", 4, "buzz", "fizz", 7, 8, "fizz", "buzz", 11, "fizz", 13, 14, "fizzbuzz", 16, 17, "fizz", 19, "buzz", "fizz", 22, 23, "fizz", "buzz", 26, "fizz", 28, 29, "fizzbuzz", 31, 32, "fizz", 34, "buzz", "fizz", 37, 38, "fizz", "buzz", 41, "fizz", 43, 44, "fizzbuzz", 46, 47, "fizz", 49, "buzz", "fizz", 52, 53, "fizz", "buzz", 56, "fizz", 58, 59, "fizzbuzz", 61, 62, "fizz", 64, "buzz", "fizz", 67, 68, "fizz", "buzz", 71, "fizz", 73, 74, "fizzbuzz", 76, 77, "fizz", 79, "buzz", "fizz", 82, 83, "fizz", "buzz", 86, "fizz", 88, 89, "fizzbuzz", 91, 92, "fizz", 94, "buzz", "fizz", 97, 98, "fizz", "buzz"]);
assert.deepEqual(fizzBuzzMap(), [1, 2, "fizz", 4, "buzz", "fizz", 7, 8, "fizz", "buzz", 11, "fizz", 13, 14, "fizzbuzz", 16, 17, "fizz", 19, "buzz", "fizz", 22, 23, "fizz", "buzz", 26, "fizz", 28, 29, "fizzbuzz", 31, 32, "fizz", 34, "buzz", "fizz", 37, 38, "fizz", "buzz", 41, "fizz", 43, 44, "fizzbuzz", 46, 47, "fizz", 49, "buzz", "fizz", 52, 53, "fizz", "buzz", 56, "fizz", 58, 59, "fizzbuzz", 61, 62, "fizz", 64, "buzz", "fizz", 67, 68, "fizz", "buzz", 71, "fizz", 73, 74, "fizzbuzz", 76, 77, "fizz", 79, "buzz", "fizz", 82, 83, "fizz", "buzz", 86, "fizz", 88, 89, "fizzbuzz", 91, 92, "fizz", 94, "buzz", "fizz", 97, 98, "fizz", "buzz"]);
assert.deepEqual([for x of fizzBuzzGen(): x], [1, 2, "fizz", 4, "buzz", "fizz", 7, 8, "fizz", "buzz", 11, "fizz", 13, 14, "fizzbuzz", 16, 17, "fizz", 19, "buzz", "fizz", 22, 23, "fizz", "buzz", 26, "fizz", 28, 29, "fizzbuzz", 31, 32, "fizz", 34, "buzz", "fizz", 37, 38, "fizz", "buzz", 41, "fizz", 43, 44, "fizzbuzz", 46, 47, "fizz", 49, "buzz", "fizz", 52, 53, "fizz", "buzz", 56, "fizz", 58, 59, "fizzbuzz", 61, 62, "fizz", 64, "buzz", "fizz", 67, 68, "fizz", "buzz", 71, "fizz", 73, 74, "fizzbuzz", 76, 77, "fizz", 79, "buzz", "fizz", 82, 83, "fizz", "buzz", 86, "fizz", 88, 89, "fizzbuzz", 91, 92, "fizz", 94, "buzz", "fizz", 97, 98, "fizz", "buzz"]);
