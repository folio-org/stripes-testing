require('cypress-downloadfile/lib/downloadFileCommand');
require('@reportportal/agent-js-cypress/lib/commands/reportPortalCommands');

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  // eslint-disable-next-line no-console
  console.log(`${runnable?.title}: ${err?.message}`);
  return false;
});

Cypress.Commands.add('normalizeText', (text) => {
  return text.replace(/\u00a0/g, ' ').trim();
});
