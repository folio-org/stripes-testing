import {
  Button,
  KeyValue,
  Pane,
} from '../../../interactors';

describe('Deleting user', () => {
  const lastName = 'Test123' + Number(new Date()).toString();
  const ResultsPane = Pane({ index: 2 });
  const ModalButtonYes = Button({ id: 'delete-user-button' });
  const ModalButtonNo = Button({ id: 'close-delete-user-button' });

  before(() => {
    cy.login('diku_admin', 'admin');
    cy.getToken('diku_admin', 'admin');
  });

  beforeEach(() => {
    cy.getUserGroups({ limit: 1 }).then(() => {
      const userData = {
        active: true,
        personal: {
          preferredContactTypeId: '002',
          lastName,
          email: 'test@folio.org',
        },
        patronGroup: Cypress.env('userGroups')[0].id,
        departments: []
      };
      cy.postUser(userData);
    });
  });

  afterEach(() => {
    cy.getUsers({ query: `personal.lastName="${lastName}"` })
      .then(() => {
        Cypress.env('users').forEach(user => {
          cy.deleteUser(user.id);
        });
      });
  });

  it('should be possible by user delete action', function () {
    const { id } = Cypress.env('user');

    cy.visit(`/users/preview/${id}`);
    cy.do([
      ResultsPane.clickAction({ id: 'clickable-checkdeleteuser' }),
      ModalButtonYes.click(),
    ]);

    cy.visit(`/users/preview/${id}`);
    cy.expect(ResultsPane.has({ id: 'pane-user-not-found' }));
  });

  it('should be cancelled when user presses "No" in confirmation modal', function () {
    const { id } = Cypress.env('user');

    cy.visit(`/users/preview/${id}`);
    cy.do([
      ResultsPane.clickAction({ id: 'clickable-checkdeleteuser' }),
      ModalButtonNo.click(),
    ]);

    cy.visit(`/users/preview/${id}`);
    cy.expect(KeyValue({ value: lastName }).exists());
  });
});
