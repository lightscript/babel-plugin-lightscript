const y = foo();

if (y < 1) {
    "lt one";
  } else if (y + 1 === 1) {
    "eq zero";
  } else if (y === 2) {
    "eq two";
  } else if (f(y)) {
    "f(y) truthy";
  } else if (y.prop) {
    "has prop";
  } else if (y[0]) {
    "has first child";
  }