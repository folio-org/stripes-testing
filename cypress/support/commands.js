require('cypress-downloadfile/lib/downloadFileCommand');

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  console.log(`${runnable?.title}: ${err?.message}`);
  return false;
});
Cypress.Commands.add('setTenant', (tenant) => {
  Cypress.env('OKAPI_TENANT', tenant);
});
