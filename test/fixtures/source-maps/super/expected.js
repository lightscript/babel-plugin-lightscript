class A extends B {
  constructor(..._args) {
    super(..._args);this.bound = this.bound.bind(this);
  }
  bound() {
    return 1;
  }
}