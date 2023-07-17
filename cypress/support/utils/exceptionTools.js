// reason of usage - https://docs.cypress.io/guides/references/error-messages#Uncaught-exceptions-from-your-application
export default function handlePromiseException() {
  // eslint-disable-next-line consistent-return
  Cypress.on('uncaught:exception', (err, runnable, promise) => {
    // when the exception originated from an unhandled promise
    // rejection from the original code
    if (promise) {
      return false;
    }
    // we still want to ensure there are no other unexpected
    // errors, so we let them fail the test
  });
}
