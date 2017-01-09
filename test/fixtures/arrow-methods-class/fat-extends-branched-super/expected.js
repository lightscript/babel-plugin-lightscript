class A extends B {
  constructor() {
    if (false) {
      super();
      this.f = this.f.bind(this);
      foo();
    } else {
      super();
      this.f = this.f.bind(this);
      bar();
    }
  }f() {
    return this;
  }
}
