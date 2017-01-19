for (const x of function* (): void {
  yield 1;
  yield 2;
}.bind(this)) {
  console.log(x);
}
