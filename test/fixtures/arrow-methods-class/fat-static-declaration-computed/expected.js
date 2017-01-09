class A {
  static ["f"]() {
    return 1;
  }
}
A["f"] = A["f"].bind(A);
