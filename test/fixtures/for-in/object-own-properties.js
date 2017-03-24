Constructor() -> this
Constructor.prototype = { shouldntSee: 'me' }

obj = new Constructor
obj.shouldSee = 'this'

keys = [for const k in obj: k]
assert.deepEqual(keys, ['shouldSee', 'shouldntSee'])

for key k in obj:
  assert(k == 'shouldSee')
