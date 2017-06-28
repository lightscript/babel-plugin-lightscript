function _hasLength(arr, minLength, maxLength) { minLength = minLength || 0; maxLength = maxLength != null ? maxLength : Number.MAX_SAFE_INTEGER; return arr != null && typeof arr !== "function" && arr.length === arr.length | 0 && arr.length >= minLength && arr.length <= maxLength; }

if (_hasLength(x, 0, 0)) {
  const [] = x;

  "empty";
} else if (_hasLength(x, 2, 2)) {
  const [a, b] = x;

  a - b;
} else if (_hasLength(x, 1, 2)) {
  const [a, b = 2] = x;

  a + b - 2;
} else if (_hasLength(x, 1)) {
  const [a, ...b] = x;

  b.concat(a);
} else if (_hasLength(x, 2) && _hasLength(x[0], 1, 2) && _hasLength(x[1], 3, 3)) {
  const [[b, d = 'e'], [g,, h], ...j] = x;

  [b, d, g, ...j].join('');
}