const it = "good";

function f() {
  {
    const it = "bad";

    if (it === true) {
        true;
      }
  }
  return it;
}