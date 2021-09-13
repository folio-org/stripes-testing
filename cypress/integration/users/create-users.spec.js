import {
  Pane,
  including,
} from '../../../interactors';

describe('Creating user', () => {
  const lastName = 'Test123' + Number(new Date()).toString();

  before(() => {
    cy.login('diku_admin', 'admin');
    cy.getToken('diku_admin', 'admin');
  });

  beforeEach(() => {
    cy.getUserGroups({ limit: 1 });
  });

  afterEach(() => {
    cy.getUsers({ query: `personal.lastName="${lastName}"` })
      .then(() => {
        Cypress.env('users').forEach(user => {
          cy.deleteUser(user.id);
        });
      });
  });

  it('should be possible by filling the "Create user" form and submitting it', function () {
    const userGroupOption = Cypress.env('userGroups')[0].group + ' (' + Cypress.env('userGroups')[0].desc + ')';

    cy.visit('/users/create');
    cy.createUser(lastName, userGroupOption, 'test@folio.org');
    cy.expect(Pane(including(lastName)).is({ visible: true, index: 2 }));
  });
});
