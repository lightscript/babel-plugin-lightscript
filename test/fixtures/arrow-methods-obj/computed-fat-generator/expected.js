const o = {
  *["f"]() {
    1;
    return 2;
  } };
o["f"] = o["f"].bind(o);