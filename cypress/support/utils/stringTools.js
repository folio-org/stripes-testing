export default function getRandomPostfix() {
  // generates random value in range [100, 1000]
  // range [0, 1000] can lead to incorrect sorting results
  // as this value is friquently used in string values generation (names, codes, ...)
  const start = (Math.random() * 900 + 100).toString(10);
  return `${start}${new Date().getMilliseconds()}`;
}
export const getTestEntityValue = (entityName) => `autotest_${entityName ? `${entityName}_` : ''}${getRandomPostfix()}`;
export const replaceByIndex = (initialString, index, newChar) => `${initialString.substring(0, index)}${newChar}${initialString.substring(index + 1)}`;
export const randomFourDigitNumber = () => Math.floor(Math.random(9000) * 1000) + 1000;
export const randomTwoDigitNumber = () => Math.floor(Math.random() * 90 + 10);
