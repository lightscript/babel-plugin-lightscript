function bitwiseNot(a) {
  return ~a;
}

function bitwiseAnd(a, b) {
  return a & b;
}

function bitwiseOr(a, b) {
  return a | b;
}

function bitwiseXor(a, b) {
  return a ^ b;
}

function bitwiseLeftShift(a, b) {
  return a << b;
}

function bitwiseRightShift(a, b) {
  return a >> b;
}

function bitwiseZeroFillRightShift(a, b) {
  return a >>> b;
}

bitwiseNot(1);
bitwiseAnd(0, 1);
bitwiseOr(0, 1);
bitwiseXor(0, 1);
bitwiseLeftShift(0, 1);
bitwiseRightShift(0, 1);
bitwiseZeroFillRightShift(0, 1);