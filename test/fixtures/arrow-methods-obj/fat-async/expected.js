const o = {
  async f() {
    return await this;
  } };
o.f = o.f.bind(o);