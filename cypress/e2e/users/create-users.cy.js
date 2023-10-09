import { Pane, including } from '../../../interactors';
import users from '../../support/fragments/users/users';

import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('Creating user', () => {
  const lastName = 'Test123' + generateItemBarcode();

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
  });

  beforeEach(() => {
    cy.getUserGroups({ limit: 1 });
  });

  afterEach(() => {
    cy.getUsers({ query: `personal.lastName="${lastName}"` }).then(() => {
      Cypress.env('users').forEach((user) => {
        users.deleteViaApi(user.id);
      });
    });
  });

  it('should be possible by filling the "Create user" form and submitting it', () => {
    const userGroupOption =
      Cypress.env('userGroups')[0].group + ' (' + Cypress.env('userGroups')[0].desc + ')';

    cy.visit('/users/create');
    cy.createUser(lastName, userGroupOption, 'test@folio.org');
    cy.expect(Pane(including(lastName)).is({ visible: true, index: 2 }));
  });
});
