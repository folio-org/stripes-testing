import {
  Button,
  KeyValue,
  Modal,
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
    cy.getServicePoints({ limit: 1, query: 'pickupLocation=="true"' });
    cy.getCancellationReasons({ limit: 1 });
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

  it('should be unable in case the user has an open requests', function () {
    const { id: userId } = Cypress.env('user');
    cy
      .getItems({ limit: 1, query: 'status.name=="Available"' })
      .then(() => {
        cy.postRequest({
          requestType: 'Page',
          fulfilmentPreference: 'Hold Shelf',
          itemId: Cypress.env('items')[0].id,
          requesterId: userId,
          pickupServicePointId: Cypress.env('servicePoints')[0].id,
          requestDate: '2021-09-20T18:36:56Z',
        });
      })
      .then(() => {
        cy.visit(`/users/preview/${userId}`);
        cy.do(
          ResultsPane.clickAction({ id: 'clickable-checkdeleteuser' })
        );

        cy.expect(
          Modal().find(ModalButtonYes).absent()
        );

        cy.putRequest({
          ...Cypress.env('request'),
          status: 'Closed - Cancelled',
          cancelledByUserId: userId,
          cancellationReasonId: Cypress.env('cancellationReasons')[0].id,
          cancelledDate: '2021-09-30T16:14:50.444Z',
        });
      });
  });
});
