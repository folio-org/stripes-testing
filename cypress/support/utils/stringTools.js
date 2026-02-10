export default function getRandomPostfix() {
  // generates random value in range [100, 1000]
  // range [0, 1000] can lead to incorrect sorting results
  // as this value is frequently used in string values generation (names, codes, ...)
  const start = (Math.random() * 900 + 100).toString(10);
  return `${start}${new Date().getMilliseconds()}`;
}
export const getTestEntityValue = (entityName) => `AT_${entityName ? `${entityName}_` : ''}${getRandomPostfix()}`;
export const replaceByIndex = (initialString, index, newChar) => `${initialString.substring(0, index)}${newChar}${initialString.substring(index + 1)}`;
export const randomFourDigitNumber = () => Math.floor(Math.random(9000) * 1000) + 1000;
export const randomTwoDigitNumber = () => Math.floor(Math.random() * 90 + 10);
export const randomNDigitNumber = (n) => Math.floor(Math.random() * (10 ** n - 10 ** (n - 1))) + 10 ** (n - 1);
// generates random delay in a range from 1 to 61 seconds plus specified number of seconds (e.g. to handle concurrency issues)
export const getRandomDelay = (seconds) => (Math.floor(Math.random() * 60) + 1 + seconds) * 1000;

export const escapeRegex = (string) => {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const getCurrentTimestamp = () => Date.now().toString();

export const getRandomLetters = (count) => {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let counter = 0;
  while (counter < count) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
    counter += 1;
  }
  return result;
};

export const pluralize = (count, singular, plural = `${singular}s`) => {
  return count === 1 ? singular : plural;
};
