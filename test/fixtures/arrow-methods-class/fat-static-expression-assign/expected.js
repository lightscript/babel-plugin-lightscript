let klass;
klass = class A {
  static f() {
    return 1;
  }
};
klass.f = klass.f.bind(klass);
