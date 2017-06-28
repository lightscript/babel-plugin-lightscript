function _hasProps(obj) { if (obj == null) return false; if (typeof obj !== "object" && typeof obj !== "function") return false; var i = arguments.length; while (--i > 0) { if (!(arguments[i] in obj)) return false; } return true; }

function _hasLength(arr, minLength, maxLength) { minLength = minLength || 0; maxLength = maxLength != null ? maxLength : Number.MAX_SAFE_INTEGER; return arr != null && typeof arr !== "function" && arr.length === arr.length | 0 && arr.length >= minLength && arr.length <= maxLength; }

if (_hasProps(x, "a", "aa") && _hasLength(x.aa, 2) && _hasProps(x.aa[1])) {
  const { a, aa: [b, { c = 1 }, ...d] } = x;

  d.concat(a + b + c);
}