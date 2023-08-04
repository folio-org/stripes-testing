export default function getRandomPostfix() {
  return `${(Math.random() * 1000).toString(
    10
  )}${new Date().getMilliseconds()}`;
}
export const getTestEntityValue = (entityName) => `autotest_${entityName ? `${entityName}_` : ''}${getRandomPostfix()}`;
export const replaceByIndex = (initialString, index, newChar) => `${initialString.substring(0, index)}${newChar}${initialString.substring(index + 1)}`;
export const randomFourDigitNumber = () => Math.floor(Math.random(9000) * 1000) + 1000;
export const randomTwoDigitNumber = () => Math.floor(Math.random() * 2);
