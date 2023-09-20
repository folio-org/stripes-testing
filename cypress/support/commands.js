require('cypress-downloadfile/lib/downloadFileCommand');
require('@4tw/cypress-drag-drop');

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  console.log(`${runnable?.title}: ${err?.message}`);
  return false;
});
