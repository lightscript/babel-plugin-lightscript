class A extends B {
  constructor(..._args) {
    super(..._args);
    this.f = this.f.bind(this);

    class C extends B {
      constructor() {
        super();
      }
    }
  }f() {
    return this;
  }
}
