require('cypress-downloadfile/lib/downloadFileCommand');

Cypress.on('uncaught:exception', (err, runnable) => {
  console.log(`${runnable?.title}: ${err?.message}`);
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
