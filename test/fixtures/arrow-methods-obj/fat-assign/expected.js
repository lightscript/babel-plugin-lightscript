let o;
o = {
  f() {
    return this;
  } };
o.f = o.f.bind(o);