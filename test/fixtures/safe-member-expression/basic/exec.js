const o = { x: 1 };

assert.equal(o?.x, 1);
assert.equal(o?.n?.x, null);
