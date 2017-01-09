function* fn() {
  return yield this;
}

fn = fn.bind(this);
