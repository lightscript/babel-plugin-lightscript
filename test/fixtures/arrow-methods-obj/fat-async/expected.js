const o = {
  async f() {
    return this;
  }
};
o.f = o.f.bind(o);