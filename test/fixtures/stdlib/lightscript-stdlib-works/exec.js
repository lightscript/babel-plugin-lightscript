assert.equal(looseEq(1, '1'), true)
assert.equal(looseEq(1, 1), true)
assert.equal(looseEq(1, '2'), false)
assert.equal(looseEq(1, 2), false)
assert.equal(looseEq(1, true), true)
assert.equal(looseEq(2, true), false)

assert.equal(looseNotEq(1, '1'), false)
assert.equal(looseNotEq(1, '2'), true)
assert.equal(looseNotEq(1, 1), false)
assert.equal(looseNotEq('hi', false), true)

assert.equal(bitwiseNot(1), -2)
assert.equal(bitwiseNot(bitwiseNot(1)), 1)
