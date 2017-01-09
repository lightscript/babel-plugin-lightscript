class A {
  constructor() {
    this.f = this.f.bind(this);
  }

  async f() {
    return await this;
  }
}
