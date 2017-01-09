var _class;

x((_class = class A {
  static f() {
    return 1;
  }
}, _class.f = _class.f.bind(_class), _class));
