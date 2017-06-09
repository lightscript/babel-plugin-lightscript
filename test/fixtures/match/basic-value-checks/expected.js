const it = x;

if (it === 1 || it === 0.1 || it === 0x11 || it === +1 || it === -1) {
  it;
} else if (it === "hi") {
  it;
} else if (it === `there ${ 1 + 1 }`) {
  it;
} else if (/\s+/.test(it)) {
  it;
} else if (typeof it === "number" || typeof it === "boolean" || typeof it === "string") {
  it;
} else if (it instanceof Array || it instanceof Object || it instanceof Map || it instanceof Foo) {
  it;
} else if (it === null || it === undefined) {
  it;
} else if (x || +x) {
  it;
} else if (!(it === 1) || !x) {
  it;
}