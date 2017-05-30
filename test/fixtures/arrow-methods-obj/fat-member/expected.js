o.o = {
  f() {
    return this;
  } };
o.o.f = o.o.f.bind(o.o);