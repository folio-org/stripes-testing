Cypress.Commands.add('search', (name) => {
  cy.get('#eholdings-search').type(name);
  cy.wait(100);
  cy.get('#search-form').submit();
  cy.wait(1000);
});
