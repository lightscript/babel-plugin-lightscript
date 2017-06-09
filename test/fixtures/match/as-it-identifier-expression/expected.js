const z = (it => {
  if (it < 1) {
      return "lt one";
    } else if (it + 1 === 1) {
      return "eq zero";
    } else if (it === 2) {
      return "eq two";
    } else if (f(it)) {
      return "f(x) truthy";
    } else if (it.prop) {
      return "has prop";
    } else if (it[0]) {
      return "has first child";
    }
})(x);
