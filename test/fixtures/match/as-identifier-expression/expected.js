const z = (y => {
  if (y < 1) {
      return "lt one";
    } else if (y + 1 === 1) {
      return "eq zero";
    } else if (y === 2) {
      return "eq two";
    } else if (f(y)) {
      return "f(x) truthy";
    } else if (y.prop) {
      return "has prop";
    } else if (y[0]) {
      return "has first child";
    }
})(x);
