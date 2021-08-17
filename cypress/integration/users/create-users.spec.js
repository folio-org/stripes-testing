describe('Creating user', () => {
  beforeEach(() => {
    cy.login('diku_admin', 'admin');
  });

  it('should be possible', function () {
    Cypress.on('uncaught:exception', () => {
      return false;
    });

    cy.visit('/users/create');
    cy.get('#adduser_lastname').type('Test123');
    cy.get('#adduser_group').select('undergrad (Undergraduate Student)', { force: true });
    cy.get('#adduser_email').type('test@folio.org', { force: true });
    cy.get('#clickable-save').click({ force: true });
    cy.get('#pane-userdetails:contains(Test123)');
    cy.get('#pane-userdetails [data-pane-header-actions-dropdown="true"]').click();
    cy.get('#clickable-checkdeleteuser').click();
    cy.get('#delete-user-button').click();
  });
});
