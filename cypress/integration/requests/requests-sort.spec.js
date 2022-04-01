import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import EditRequest from '../../support/fragments/requests/edit-request';
import { MultiColumnListHeader } from '../../../interactors';

describe('ui-requests: Sort requests', () => {
  const usersData = [];
  const requestsData = [];
  const cancellationReasons = [];

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken('diku_admin', 'admin');

    Requests.requestTypes.forEach((requestType) => {
      const itemStatus = requestType === 'Page' ? 'Available' : 'Checked out';
      Requests.createRequestApi(itemStatus, requestType).then(({
        createdUser,
        createdRequest,
        cancellationReasonId
      }) => {
        usersData.push(createdUser);
        requestsData.push(createdRequest);
        cancellationReasons.push(cancellationReasonId);
      });
    });
  });

  afterEach(() => {
    Requests.requestTypes.forEach((_, i) => {
      EditRequest.updateRequestApi({
        ...requestsData[i],
        status: 'Closed - Cancelled',
        cancelledByUserId: requestsData[i].requesterId,
        cancellationReasonId: cancellationReasons[i],
        cancelledDate: new Date().toISOString(),
      });
      cy.deleteUser(usersData[i].id);
    });
  });

  it('should implement e-2-e automation of test case C2379: Test Request app sorting', { tags: [testType.smoke] }, () => {
    cy.visit(TopMenu.requestsPath);

    cy.intercept('GET', '/circulation/requests*').as('getRequests');

    Requests.checkAllRequestTypes();
    Requests.validateRequestTypes();

    // Validate that the requests are sorted by Request date (oldest at top) by default
    Requests.validateRequestsDateSortingOrder('ascending');

    // Click column header Request Date to verify that they reverse sort
    cy.do(MultiColumnListHeader('Request Date').click());
    Requests.waitLoadingRequests();
    Requests.validateRequestsDateSortingOrder('descending');

    Requests.sortingColumns.forEach(column => {
      // Validate sort
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({ headerId: column.id, columnIndex: column.columnIndex });

      // Validate reverse sorting
      cy.do(MultiColumnListHeader(column.title).click());
      Requests.validateRequestsSortingOrder({ headerId: column.id, columnIndex: column.columnIndex });
    });
  });
});
