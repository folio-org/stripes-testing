/* eslint-disable import/prefer-default-export */
// long delay especially related with issue with data import performance
export function getLongDelay(defaultTimeout = 60000) {
  return { timeout: defaultTimeout };
}
