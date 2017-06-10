function _hasProps(obj) { if (obj == null) return false; if (typeof obj !== "object" && typeof obj !== "function") return false; var i = arguments.length; while (--i > 0) { if (!(arguments[i] in obj)) return false; } return true; }

const it = foo();

if (it === 1) {
  {
    const it = it;

    if (it === 2) {
        it;
      }
  }
} else if (_hasProps(it, "x")) {
  const { x } = it;
  {
    const it = x;

    if (it === 2) {
        it;
      }
  }
}