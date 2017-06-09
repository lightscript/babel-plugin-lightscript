if (x === 1 || x === 0.1 || x === 0x11 || x === +1 || x === -1) {
  it;
} else if (x === "hi") {
  it;
} else if (x === `there ${ 1 + 1 }`) {
  it;
} else if (/\s+/.test(x)) {
  it;
} else if (typeof x === "number" || typeof x === "boolean" || typeof x === "string") {
  it;
} else if (x instanceof Array || x instanceof Object || x instanceof Map || x instanceof Foo) {
  it;
} else if (x === null || x === undefined) {
  it;
} else if (x || +x) {
  it;
} else if (!(x === 1) || !x) {
  it;
}
