async function fn() {
  const { x, xx: { xxx } } = await fetch();
  const [y, [yy]] = await fetch();
  return x + y;
}
