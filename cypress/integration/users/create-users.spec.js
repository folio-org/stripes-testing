import {
  Pane,
} from "../../../interactors";

describe('Creating user', () => {
  beforeEach(() => {
    cy.login('diku_admin', 'admin');
  });

  it('should be possible', function () {
    cy.visit('/users/create');
    cy.createUser('Test123', 'undergrad (Undergraduate Student)', 'test@folio.org');
    cy.expect(Pane('Test123 ').is({ visible: true, index: 2 }));

    cy.get('#pane-userdetails [data-pane-header-actions-dropdown="true"]').click();
    cy.get('#clickable-checkdeleteuser').click();
    cy.get('#delete-user-button').click();
  });
});
