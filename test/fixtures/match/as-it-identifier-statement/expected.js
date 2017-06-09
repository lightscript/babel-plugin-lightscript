const it = x;

if (it < 1) {
    "lt one";
  } else if (it + 1 === 1) {
    "eq zero";
  } else if (it === 2) {
    "eq two";
  } else if (f(it)) {
    "f(x) truthy";
  } else if (it.prop) {
    "has prop";
  } else if (it[0]) {
    "has first child";
  }
