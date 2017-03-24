let x
for let i=0; i<10; i++:
  for let j=0; j<10; j++:
    now x = i + j
assert.equal(x, 18)

let y
for let i=0; i<10; i++: for let j=0; j<10; j++: now y = i + j
assert.equal(y, 18)
