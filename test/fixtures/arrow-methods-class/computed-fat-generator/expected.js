class A {
  constructor() {
    this["f"] = this["f"].bind(this);
  }

  *["f"]() {
    1;
    return 2;
  }
}
