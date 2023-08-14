import arrays, { randomizeArray } from './arrays';

export default function generatePassword(passwordLength = 8) {
  let password = '';
  const allowedChars = randomizeArray([
    arrays.genCharArray('A', 'Z'),
    arrays.genCharArray('a', 'z'),
    arrays.genCharArray('0', '9'),
    arrays.genCharArray(':', '@'),
  ]);

  for (let i = 0; i < passwordLength; i++) {
    const arrLen = allowedChars.length;
    password += arrays.getRandomElement(allowedChars[((i % arrLen) + arrLen) % arrLen]);
  }
  return password;
}
