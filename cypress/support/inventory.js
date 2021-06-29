Cypress.Commands.add('searchMARC', (name) => {
  cy.get('#input-inventory-search').type(name);
  cy.get('#accordion-toggle-button-source').click();
  cy.get('#clickable-filter-source-marc').click();
});
