import {
  Pane,
} from "../../../interactors";

describe('Creating user', () => {
  beforeEach(() => {
    cy.login('diku_admin', 'admin');

    cy.getToken('diku_admin', 'admin')
      .then(() => {
        cy.getUserGroups({ limit: 1 });
      });
  });

  it('should be possible', function () {
    const userGroupOption = Cypress.env('userGroups')[0].group + ' (' + Cypress.env('userGroups')[0].desc + ')';

    cy.visit('/users/create');
    cy.createUser('Test123', userGroupOption, 'test@folio.org');
    cy.expect(Pane('Test123 ').is({ visible: true, index: 2 }));

    cy.get('#pane-userdetails [data-pane-header-actions-dropdown="true"]').click();
    cy.get('#clickable-checkdeleteuser').click();
    cy.get('#delete-user-button').click();
  });
});
