class A {
  constructor() {
    this.f = this.f.bind(this);

    foo();
  } // don't be ugly, output!
  f() {
    return this;
  }
}
