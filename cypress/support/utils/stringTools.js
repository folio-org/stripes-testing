export default function getRandomPostfix() {
  return `${(Math.random() * 1000)
    .toString(10)}${new Date().getMilliseconds()}`;
}
export const getTestEntityValue = (entityName) => `autotest_${entityName ? `${entityName}_` : ''}${getRandomPostfix()}`;
export const replaceByIndex = (initialString, index, newChar) => `${initialString.substring(0, index)}${newChar}${initialString.substring(index + 1)}`;
