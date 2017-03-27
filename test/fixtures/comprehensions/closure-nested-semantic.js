closures = [ for idx i in Array(10): f() -> g() -> i ]
closureResults = [ for elem f in closures: f()() ]

assert.deepEqual(closureResults, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
