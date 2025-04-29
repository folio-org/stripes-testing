export default function getRandomStringCode(len) {
  const lettersUC = 'ABDEFGHKMNPQRSTWXZ';
  let str = '';
  for (let i = 0; i < len; i++) {
    const position = Math.floor(Math.random() * lettersUC.length);
    str += lettersUC.substring(position, position + 1);
  }
  return str;
}
