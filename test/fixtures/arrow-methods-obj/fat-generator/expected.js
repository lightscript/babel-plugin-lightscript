const o = {
  *f() {
    return yield this;
  } };
o.f = o.f.bind(o);