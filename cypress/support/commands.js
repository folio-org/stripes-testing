require('cypress-downloadfile/lib/downloadFileCommand');

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  // eslint-disable-next-line no-console
  console.log(`${runnable?.title}: ${err?.message}`);
  return false;
});
