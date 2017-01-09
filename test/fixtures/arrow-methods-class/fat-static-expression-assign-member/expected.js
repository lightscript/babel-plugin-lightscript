let obj = {};
obj["klass"] = class A {
  static f() {
    return 1;
  }
};
obj["klass"].f = obj["klass"].f.bind(obj["klass"]);
