export default function getRandomPostfix() {
  return `${(Math.random() * 1000)
    .toString(10)}${new Date().getMilliseconds()}`;
}
