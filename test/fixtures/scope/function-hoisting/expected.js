function outer(): void {
  if (true) {
    function inner() {
      return 1;
    }
  }
  inner = 3;
}
