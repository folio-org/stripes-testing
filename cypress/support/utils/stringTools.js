export default function getRandomPostfix() {
  return `${(Math.random() * 1000)
    .toString(10)}${new Date().getMilliseconds()}`;
}

export const getTestEntityValue = (entityName) => `autotest_${entityName ? `${entityName}_` : ''}${getRandomPostfix()}`;
