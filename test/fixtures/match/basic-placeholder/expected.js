if (x < 1) {
    "lt one";
  } else if (x + 1 === 1) {
    "eq zero";
  } else if (x === 2) {
    "eq two";
  } else if (f(x)) {
    "f(x) truthy";
  } else if (x.prop) {
    "has prop";
  } else if (x[0]) {
    "has first child";
  }
