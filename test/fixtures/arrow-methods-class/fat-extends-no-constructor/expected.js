class A extends B {
  constructor(..._args) {
    super(..._args);
    this.f = this.f.bind(this);
  }

  f() {
    return this;
  }
}
