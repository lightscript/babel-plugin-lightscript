let x
for i from 0 til 10:
  for j from 0 til 10:
    now x = i + j
assert.equal(x, 18)

let y
for i from 0 til 10: for j from 0 til 10: now y = i + j
assert.equal(y, 18)
