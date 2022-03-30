import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import { MultiColumnListHeader } from '../../../interactors';

describe('Filter Requests by Request data', () => {
  const usersData = [];
  const requestsData = [];
  const cancellationReasons = [];

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken('diku_admin', 'admin');
  });

  // beforeEach(() => {
  //   for (let i = 0; i < 3; i++) {
  //     cy.createRequestApi().then(({
  //       createdUser,
  //       createdRequest,
  //       cancellationReasonId
  //     }) => {
  //       usersData.push(createdUser);
  //       requestsData.push(createdRequest);
  //       cancellationReasons.push(cancellationReasonId);
  //     });
  //   }
  // });

  // afterEach(() => {
  //   for (let i = 0; i < 3; i++) {
  //     cy.changeItemRequestApi({
  //       ...requestsData[i],
  //       status: 'Closed - Cancelled',
  //       cancelledByUserId: requestsData[i].requesterId,
  //       cancellationReasonId: cancellationReasons[i],
  //       cancelledDate: new Date().toISOString(),
  //     });
  //     cy.deleteUser(usersData[i].id);
  //   }
  // });

  it('should check all the request types', { tags: [testType.smoke] }, () => {
    cy.visit(TopMenu.requestsPath);

    Requests.checkAllRequestTypes();
    Requests.validateRequestTypes();

    // Validate that the requests are sorted by Request date (oldest at top) by default
    Requests.validateRequestsDateSortingOrder();

    cy.intercept('GET', '/circulation/requests?*').as('getRequests');

    // Click column header Request Date to verify that they reverse sort
    cy.do(MultiColumnListHeader('Request Date').click());
    cy.wait('@getRequests');
    Requests.validateRequestsDateSortingOrder();

    /*
      *** Flakey tests
    */
    Requests.sortingColumns.forEach(column => {
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({ headerTitle: column.id, columnIndex: column.columnIndex });

      // Validate reverse sorting
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({ headerTitle: column.id, columnIndex: column.columnIndex });
    });
    /*
      *** Flakey tests
    */
  });
});
