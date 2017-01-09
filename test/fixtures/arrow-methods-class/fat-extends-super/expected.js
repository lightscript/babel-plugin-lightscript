class A extends B {
  constructor() {
    foo();
    super();
    this.f = this.f.bind(this);
    bar();
  } // don't be ugly, output!
  f() {
    return this;
  }
}
