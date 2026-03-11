export default function getRandomStrongPassword(len = 15) {
  const lettersUC = 'ABDEFGHKMNPQRSTWXZ!@#$%^&*()_+1234567980qwertyuiopasdfghjklzxcvbnm';
  let str = '';
  for (let i = 0; i < len; i++) {
    const position = Math.floor(Math.random() * lettersUC.length);
    str += lettersUC.substring(position, position + 1);
  }
  return str;
}
