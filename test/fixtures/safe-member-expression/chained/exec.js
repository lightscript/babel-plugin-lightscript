const o = { x: { y: 1 } };

assert.equal(o?.x?.y, 1);
assert.equal(o.x?.y, 1);
assert.equal(o?.x?.n?.y, null);
